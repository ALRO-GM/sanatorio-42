/** Banco de Not-games en francés: el curso de RAG (`../course-rag.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const COURSE_RAG_FR: Readonly<Record<string, ConceptText>> = {
  'rag-context': {
    forms: [
      {
        ask: [
          'Le modèle a appris avec la version 1 de ton projet et le guide a changé. Sans contexte, que répond-il ?',
          'Sans aucun morceau du nouveau guide, un modèle entraîné sur la version 1 répond…',
        ],
        right: ['La donnée de la version 1, avec aplomb', 'Ce qu’il a appris : la donnée périmée'],
        wrong: [
          'La nouvelle donnée, lue dans le guide',
          'La citation du guide qui le dit',
          'La nouvelle donnée, avec sa source',
          'Un morceau du guide, sans changement',
        ],
      },
      {
        ask: [
          'Ton bot répond avec les données d’une vieille version et ne cite rien. Que lui manque-t-il ?',
          'Un bot qui répond de mémoire, avec de vieilles données et sans sources, a besoin…',
        ],
        right: [
          'Des morceaux de tes documents, avec leur citation',
          'Du contexte de ta documentation, cité',
        ],
        wrong: [
          'D’un modèle plus gros, avec plus de mémoire',
          'De plus d’exemples de réponses dans le prompt',
          'De morceaux plus petits au découpage',
          'D’un cache pour les réponses',
        ],
      },
    ],
    wrong: [],
    why: 'Sans contexte, le modèle répond de mémoire et avec aplomb ; le RAG lui donne les bons morceaux pour qu’il réponde en lisant et qu’il cite.',
  },
  'rag-corpus-filter': {
    forms: [
      {
        ask: [
          'Tu vas indexer un dépôt pour ton RAG. Quel fichier laisses-tu de côté ?',
          'En chargeant le corpus de ton RAG, lequel de ces fichiers n’indexes-tu pas ?',
        ],
        right: ['`.env`', '`poetry.lock`'],
        wrong: [
          '`README.md`',
          '`docs/install.md`',
          '`src/worker.py`',
          '`docs/deploy.md`',
          '`src/retry.py`',
        ],
      },
      {
        ask: [
          'Après avoir indexé tout le dépôt, ton RAG copie les réponses de l’évaluation. Qu’est-ce qui est entré dans l’index ?',
          'Ton RAG a une note magnifique parce qu’il copie les réponses attendues. Qu’est-ce qui s’est glissé à l’indexation ?',
        ],
        right: [
          'Les questions d’évaluation avec leur réponse',
          'Le fichier d’évaluation, avec les solutions',
        ],
        wrong: [
          'Un fichier avec des mots de passe',
          'Un fichier qui répète des mots-clés',
          'Des morceaux répétés par le chevauchement',
          'Le code sans documentation',
        ],
      },
    ],
    wrong: [],
    why: 'Ce que tu indexes peut finir dans une réponse : dehors les secrets (.env), le bruit (.lock) et les questions d’évaluation, qui gonflent la note.',
  },
  'rag-chunk-cut': {
    forms: [
      {
        ask: [
          'Ton banc d’essai affiche « Perdue au découpage ». Qu’est-ce que ça veut dire ?',
          'Une question se perd au découpage. Qu’est-il arrivé aux morceaux ?',
        ],
        right: [
          'La phrase de la réponse a été coupée en deux',
          'Une coupe a tranché la réponse en deux',
        ],
        wrong: [
          'Le bon morceau ne tient pas dans le prompt',
          'La recherche ne trouve pas le bon morceau',
          'Le modèle invente la réponse',
          'Il y a trop de morceaux à chercher',
        ],
      },
      {
        ask: [
          'La phrase d’une réponse tombe pile entre deux morceaux. Quel changement règle ça ?',
          'Une coupe tranche en deux la phrase avec la réponse. Qu’ajustes-tu ?',
        ],
        right: [
          'Un peu de chevauchement entre morceaux',
          'Des morceaux un peu plus grands ou qui se chevauchent',
        ],
        wrong: [
          'Un reclassement des candidats',
          'La recherche sémantique au lieu de lexicale',
          'Des morceaux plus petits et plus nombreux',
          'Retirer les mots vides',
        ],
      },
    ],
    wrong: [],
    why: 'Si une coupe tranche la phrase de la réponse, aucun morceau ne l’a en entier : augmente la taille ou ajoute juste ce qu’il faut de chevauchement.',
  },
  'rag-normalize': {
    forms: [
      {
        ask: [
          'La requête « LIMITE DE TAMANO » ne trouve pas le morceau qui dit « Límite de tamaño ». Que manque-t-il ?',
          'Avec BM25, « LIMITE DE TAMANO » ne donne rien, alors que le document dit « Límite de tamaño ». Que te manque-t-il ?',
        ],
        right: [
          'Normaliser : minuscules et sans accents',
          'Tout passer en minuscules et ôter les accents',
        ],
        wrong: [
          'Monter k1 pour que répéter compte plus',
          'Baisser b pour ne pas pénaliser les longs',
          'Plus de chevauchement entre les morceaux',
          'Demander plus de résultats (k = 10)',
        ],
      },
      {
        ask: [
          'Pourquoi normalise-t-on les tokens avant d’indexer ?',
          'Normaliser le texte à la tokenisation sert à ce…',
        ],
        right: [
          'Que majuscules, accents et pluriels ne comptent pas',
          'Que « Límite » et « limite » soient le même mot',
        ],
        wrong: [
          'Que chaque mot pèse selon sa rareté',
          'Que les longs morceaux ne gagnent pas pour leur longueur',
          'Que tous les morceaux aient la même taille',
          'Que chaque mot devienne un vecteur',
        ],
      },
    ],
    wrong: [],
    why: 'Normaliser enlève ce qui ne compte pas pour comparer (majuscules, accents, pluriels) ; sans ça, « LIMITE » et « Límite » sont deux mots différents.',
  },
  'rag-idf': {
    forms: [
      {
        ask: [
          'Dans un index de 40 morceaux, « tarea » apparaît dans 30 et « heartbeat » dans 2. Lequel pèse le plus dans BM25 ?',
          'Sur 40 morceaux, « tarea » est dans 30 et « heartbeat » dans 2. Au score BM25, celui qui décide le plus est…',
        ],
        right: [
          '« heartbeat », car il est dans peu de morceaux',
          '« heartbeat » : c’est le mot rare',
        ],
        wrong: [
          '« tarea », car il est dans beaucoup de morceaux',
          'Les deux pareil : une fois chacun',
          '« tarea », car il vient en premier dans la requête',
          'Celui des deux qui est le plus long',
        ],
      },
      {
        ask: [
          'Un mot apparaît dans presque tous les morceaux de l’index. Quel poids a-t-il dans le score BM25 ?',
          'Si un terme est dans presque tous les morceaux, dans BM25 il compte…',
        ],
        right: [
          'Presque rien : son IDF est très bas',
          'Très peu, car il ne distingue aucun morceau',
        ],
        wrong: [
          'Beaucoup : il est partout',
          'Autant que n’importe quel autre mot',
          'Beaucoup, si le morceau est court',
          'Ça dépend seulement de son TF dans le morceau',
        ],
      },
    ],
    wrong: [],
    why: 'L’IDF mesure à quel point un mot distingue : presque zéro s’il est dans tous les morceaux, élevé s’il est dans peu. C’est le mot rare qui décide.',
  },
  'rag-bm25-k1': {
    forms: [
      {
        ask: ['Dans BM25, que contrôle le paramètre `k1` ?', 'Le `k1` de BM25 décide…'],
        right: [
          'Combien répéter un mot continue de compter',
          'Combien rapporte la répétition du terme dans le morceau',
        ],
        wrong: [
          'Combien on pénalise les longs morceaux',
          'Combien de résultats rend la recherche',
          'Combien pèse la liste sémantique',
          'Combien de mots partagent deux morceaux',
        ],
      },
      {
        ask: [
          'Un fichier qui répète « retry » sans arrêt sort premier dans BM25 et tu ne peux pas l’enlever. Que touches-tu ?',
          'Un morceau de bruit gagne dans BM25 juste en répétant le mot cherché. Qu’ajustes-tu ?',
        ],
        right: [
          'Baisser k1 pour que répéter compte peu',
          'Baisser k1 : la répétition sature plus tôt',
        ],
        wrong: [
          'Monter k1 pour que le mot compte plus',
          'Monter k pour voir plus de résultats',
          'Couper la normalisation des tokens',
          'Monter le chevauchement entre morceaux',
        ],
      },
    ],
    wrong: [],
    why: 'k1 dit combien répéter un mot continue de compter : avec un k1 élevé, gagne celui qui le répète le plus, pas celui qui répond.',
  },
  'rag-search-kind': {
    forms: [
      {
        ask: [
          'Le guide dit « reintentos » et quelqu’un demande le délai avant de « volver a intentarlo ». Quelle recherche trouve le morceau ?',
          'Si on pose la question avec d’autres mots que ceux de ton guide, quelle recherche trouve le bon morceau ?',
        ],
        right: ['La sémantique, avec des embeddings', 'Celle qui compare des vecteurs (cosinus)'],
        wrong: [
          'La lexicale, avec BM25',
          'La lexicale, si tu normalises les accents',
          'La lexicale, avec un k1 plus haut',
          'Aucune : il faut les mêmes mots',
        ],
      },
      {
        ask: [
          'Tu demandes où est définie `backoff_seconds`. Quelle recherche met en premier le morceau de cette fonction ?',
          'Avec un identifiant exact dans la requête, comme `backoff_seconds`, celle qui réussit le mieux est…',
        ],
        right: ['La lexicale, avec BM25', 'Celle qui compare des mots (BM25)'],
        wrong: [
          'La sémantique, avec des embeddings',
          'Celle qui compare des vecteurs (cosinus)',
          'Les deux, exactement pareil',
          'Aucune des deux ne la trouve',
        ],
      },
      {
        ask: [
          'Certaines questions utilisent des noms exacts et d’autres, des mots différents du guide. Quelle recherche montes-tu ?',
          'Si on te pose des questions avec des identifiants comme avec ses propres mots, il te faut…',
        ],
        right: [
          'Une hybride qui joint lexicale et sémantique',
          'Les deux, lexicale et sémantique, fusionnées',
        ],
        wrong: [
          'Seulement la sémantique, qui comprend le sens',
          'Seulement la lexicale, avec un k plus haut',
          'Seulement la lexicale, avec plus de chevauchement',
          'Seulement la sémantique, avec de plus gros morceaux',
        ],
      },
    ],
    wrong: [],
    why: 'La lexicale réussit avec les mots et identifiants exacts, et la sémantique, avec d’autres mots ; l’hybride joint les deux listes.',
  },
  'rag-rrf': {
    forms: [
      {
        ask: [
          'Avec RRF et k = 60, un morceau est 1er dans la liste lexicale et 3e dans la sémantique. Quel score obtient-il ?',
          'En RRF (k = 60), un morceau 1er dans une liste et 3e dans l’autre marque…',
        ],
        right: ['1/61 + 1/63'],
        wrong: ['1/1 + 1/3', '1/61 + 1/61', '1/(60 + 1 + 3)', '61 + 63', '60/1 + 60/3'],
      },
      {
        ask: [
          'Tu fusionnes les listes en additionnant BM25 et cosinus, et la fusion sort identique à la lexicale. Pourquoi ?',
          'En additionnant BM25 et cosinus tels quels, la liste lexicale décide de tout. Que se passe-t-il ?',
        ],
        right: [
          'BM25 donne de grands nombres et le cosinus ne passe pas 1',
          'Ils sont à des échelles différentes et BM25 domine',
        ],
        wrong: [
          'La sémantique n’a trouvé aucun morceau',
          'BM25 est calculé après et écrase le cosinus',
          'Les tokens de la requête n’étaient pas normalisés',
          'Le cosinus ne compte que pour le premier morceau',
        ],
      },
    ],
    wrong: [],
    why: 'RRF ne regarde que les rangs : chaque liste ajoute 1/(k + rang). Additionner BM25 et cosinus tels quels ne marche pas : ce sont des échelles différentes.',
  },
  'rag-prompt-budget': {
    forms: [
      {
        ask: [
          'Budget : 100 tokens. Les instructions et la question en prennent 40, et chaque morceau, avec son étiquette, 25. Combien de morceaux entrent ?',
          'Avec un budget de 100 tokens, 40 pour la partie fixe et des morceaux de 25 (étiquette comprise), combien tiennent ?',
        ],
        right: ['2'],
        wrong: ['3', '4', '1', '0'],
      },
      {
        ask: [
          'Tu récupères 5 morceaux et le meilleur, 1er de la liste, reste hors du prompt. Que s’est-il passé ?',
          'Le morceau le mieux noté n’entre pas dans le prompt et les pires, si. Pourquoi ?',
        ],
        right: [
          'Tu as rempli du pire au meilleur et la coupe l’a laissé dehors',
          'Ils sont entrés à l’envers et le budget a coupé',
        ],
        wrong: [
          'La recherche ne l’a jamais renvoyé',
          'Le découpage a tranché la réponse',
          'Le modèle l’a lu et ne l’a pas cité',
          'Le budget ne compte pas la question',
        ],
      },
    ],
    wrong: [],
    why: 'Le prompt se remplit dans l’ordre jusqu’au budget et le premier qui ne tient pas coupe : remplis-le du meilleur au pire et compte la partie fixe.',
  },
  'rag-idk': {
    forms: [
      {
        ask: [
          'Tu demandes le prix de la licence, ce que ton corpus ne dit pas, et le bot cite une phrase du README. Qu’ajustes-tu ?',
          'Face à une question sans réponse dans le corpus, le bot répond un truc qui ressemble à peine, avec citation. Que changes-tu ?',
        ],
        right: [
          'Monter l’appui minimal pour qu’il dise « je ne sais pas »',
          'Exiger plus d’appui avant de donner une réponse',
        ],
        wrong: [
          'Monter k pour qu’il trouve la licence',
          'Retirer les citations des réponses',
          'Baisser l’appui minimal à 1',
          'Donner plus de budget au prompt',
        ],
      },
      {
        ask: [
          'À quoi sert l’appui minimal à la génération ?',
          'L’appui minimal du générateur sert à…',
        ],
        right: [
          'Dire « je ne sais pas » si rien n’appuie assez',
          'Se taire quand le contexte appuie peu la réponse',
        ],
        wrong: [
          'Fixer combien de morceaux entrent dans le prompt',
          'Écarter les morceaux à faible cosinus en cherchant',
          'Décider combien de citations a chaque réponse',
          'Limiter le temps que met le modèle à répondre',
        ],
      },
    ],
    wrong: [],
    why: 'Avec un appui minimal, si aucune phrase du contexte n’appuie assez la réponse, le bot dit « je ne sais pas » au lieu de répondre ce qui ressemble le plus.',
  },
  'rag-recall-mrr': {
    forms: [
      {
        ask: [
          'Sur 4 questions, le bon morceau est dans les 3 premiers pour 3 d’entre elles. Quel recall@3 ça donne ?',
          'Ta recherche ramène le bon morceau dans le top 3 pour 3 questions sur 4. Son recall@3 est…',
        ],
        right: ['0,75'],
        wrong: ['0,25', '3', '0,33', '1'],
      },
      {
        ask: [
          'Sur 3 questions, la première réussite tombe aux rangs 1, 2 et 4. Quel MRR ça donne ?',
          'Premier bon morceau aux rangs 1, 2 et 4 sur trois questions : le MRR est…',
        ],
        right: ['0,58'],
        wrong: ['2,33', '0,43', '1,75', '0,25', '0,33'],
      },
      {
        ask: [
          'Tu récupères 10 morceaux et un seul a la réponse. Quelle précision@10 ça donne ?',
          'Avec k = 10 et un seul bon morceau parmi ceux récupérés, la précision est…',
        ],
        right: ['0,1'],
        wrong: ['1', '10', '0,9', '0,5'],
      },
    ],
    wrong: [],
    why: 'Le recall@k compte pour combien de questions le bon morceau est dans les k premiers ; le MRR récompense qu’il sorte tôt (moyenne de 1/rang) ; la précision, la part utile de ce qui est ramené.',
  },
  'rag-eval-split': {
    forms: [
      {
        ask: [
          'En validation croisée, une configuration obtient 1,00, 0,50 et 0,60 sur trois groupes. Quelle note lui donnes-tu ?',
          'Trois groupes de questions donnent 1,00, 0,50 et 0,60 à la même configuration. Elle vaut…',
        ],
        right: ['0,70'],
        wrong: ['1,00', '0,50', '0,75', '2,10'],
      },
      {
        ask: [
          'Tu ajustes le RAG en regardant les questions de test jusqu’à obtenir 1,00 dessus. Qu’as-tu fait de travers ?',
          'Tu choisis la configuration d’après sa note sur les questions de test, celles mises de côté. Qu’est-ce qui cloche ?',
        ],
        right: [
          'Tu as ajusté sur le test : il ne mesure plus rien',
          'Utiliser ce qui était de côté pour ajuster, pas pour vérifier',
        ],
        wrong: [
          'Essayer trop peu de configurations',
          'Ne pas monter k au maximum',
          'Mesurer avec le recall au lieu du MRR',
          'Ne pas reclasser les résultats de recherche',
        ],
      },
    ],
    wrong: [],
    why: 'On ajuste avec les questions de développement et avec la moyenne de plusieurs groupes ; celles de test se regardent une fois, à la fin, sinon la note ne mesure plus rien.',
  },
  'rag-cache': {
    forms: [
      {
        ask: [
          'Le guide passe de 5 à 7 tentatives, tu réindexes et le bot dit toujours 5. Qu’est-ce qui a raté ?',
          'Après avoir changé un guide et réindexé, le bot répète l’ancienne réponse. Pourquoi ?',
        ],
        right: [
          'Le cache n’a pas été vidé à la réindexation',
          'Le cache sert encore l’ancienne réponse',
        ],
        wrong: [
          'Le modèle se souvient de la version d’avant',
          'Le découpage a tranché la nouvelle phrase',
          'BM25 préfère l’ancien nombre',
          'Le k de la recherche est trop bas',
        ],
      },
      {
        ask: [
          'La même question écrite en majuscules ne tombe pas dans ton cache. Que changes-tu ?',
          'Ton cache traite « RETRY » et « retry » comme deux questions différentes. Que corriges-tu ?',
        ],
        right: [
          'Normaliser la question avant d’en faire la clé',
          'La clé : que ce soit la question normalisée',
        ],
        wrong: [
          'Vider le cache à chaque réindexation',
          'Donner plus de place au cache',
          'Garder aussi les morceaux récupérés',
          'Indexer aussi le corpus en majuscules',
        ],
      },
    ],
    wrong: [],
    why: 'Le cache évite de chercher et de générer, mais il faut le vider à la réindexation (sinon il sert de vieilles réponses) et prendre pour clé la question normalisée.',
  },
  'rag-api': {
    forms: [
      {
        ask: [
          'L’API de ton RAG reçoit `POST /answer` avec `k = 1000`. Si elle valide avant de chercher, quel code renvoie-t-elle ?',
          '`POST /answer` arrive avec `k = 1000`. Une API qui valide avant de chercher répond…',
        ],
        right: ['422'],
        wrong: ['200', '500', '404', '405', '413'],
      },
      {
        ask: [
          'Pourquoi ton API valide-t-elle `k` et la requête avant de chercher ?',
          'Ton API vérifie `q` et `k` avant de toucher l’index. Elle le fait pour…',
        ],
        right: [
          'Qu’un k énorme ne fasse pas tomber le service',
          'Ne pas gaspiller de travail sur de mauvaises requêtes',
        ],
        wrong: [
          'Que le cache garde plus de réponses',
          'Monter le recall de la recherche',
          'Que le modèle cite mieux ses sources',
          'Renvoyer toujours un code 200',
        ],
      },
    ],
    wrong: [],
    why: 'Une API valide avant de travailler : une requête vide ou un k hors limites, c’est un 422, pas une recherche qui fait tomber le service.',
  },
  'rag-stages': {
    forms: [
      {
        ask: [
          'Le bon morceau est parmi les k récupérés, mais le modèle ne le lit jamais. Quelle étape échoue ?',
          'La recherche le ramène, mais il n’est pas dans ce que lit le modèle. À quelle étape se perd-il ?',
        ],
        right: ['La construction du prompt'],
        wrong: ['Le découpage', 'La recherche', 'La génération', 'Le chargement du corpus'],
      },
      {
        ask: [
          'La réponse est entière dans un morceau, mais ce morceau n’est pas dans les k premiers. Quelle étape échoue ?',
          'Un morceau contient la bonne phrase en entier et n’apparaît pas dans les résultats. Où se perd-elle ?',
        ],
        right: ['La recherche', 'La récupération'],
        wrong: [
          'Le découpage',
          'La construction du prompt',
          'La génération',
          'Le chargement du corpus',
        ],
      },
      {
        ask: [
          'Aucun morceau de l’index ne contient en entier la phrase avec la réponse. Quelle étape échoue ?',
          'La bonne phrase n’est complète dans aucun morceau. Où se perd la réponse ?',
        ],
        right: ['Le découpage'],
        wrong: ['La recherche', 'La construction du prompt', 'La génération', 'Le reclassement'],
      },
    ],
    wrong: [],
    why: 'Suis le bon morceau : s’il n’est pas entier, c’est le découpage ; s’il n’est pas dans les k, la recherche ; s’il n’entre pas, le prompt ; s’il entre et ne ressort pas, la génération.',
  },
}
