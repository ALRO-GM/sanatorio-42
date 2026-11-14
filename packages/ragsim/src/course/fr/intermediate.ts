/**
 * Nivel intermedio en francés. Mismas partes, mismas líneas de ejemplo y
 * mismos pasos que en inglés; el código, los números y las frases del corpus
 * (en castellano, como en el resto de idiomas) no se tocan.
 */

import type { UnitText } from '../types.js'

export const INTERMEDIATE_FR: Record<string, UnitText> = {
  'rag-hybrid': {
    title: 'Recherche hybride',
    goal: 'Ni la recherche lexicale ni la sémantique ne trouvent tout. Mesure les deux et trouve le mode qui touche le plus dans les 3 premiers.',
    theory: {
      what: 'La recherche hybride lance la recherche lexicale et la sémantique et fusionne leurs listes. Chacune touche là où l’autre rate.',
      how: [
        'lex = bm25(question, 20)      # noms exacts',
        'sem = cosinus(question, 20)   # d’autres mots',
        'top = fusionner(lex, sem)[:k] # le meilleur des deux',
      ],
      when: 'Dès que ton corpus mélange du code et des identifiants avec des questions de vraies personnes. C’est presque toujours le cas.',
      whenNot:
        'Sans temps pour calculer les embeddings, BM25 seul est un point de départ correct et rapide.',
      problems:
        'Choisir un moteur sur deux exemples. Le lexical rate « run twice » et le sémantique rate "--legacy" : chacun perd des questions. Mesure les trois options.',
    },
    example:
      'Avant de regarder : quelqu’un demande "--legacy", qui n’est pas du tout un concept. Lequel des deux moteurs le trouve ?',
    frames: [
      'Sémantique : "--legacy" ne veut rien dire pour le modèle et la liste revient vide.',
      'Lexical : le mot exact est dans un seul morceau et il arrive en premier.',
      'Hybride : il garde la réussite de celui qui l’a.',
    ],
  },
  'rag-rrf': {
    title: 'Fusion des rangs (RRF)',
    goal: 'Calcule à la main le score RRF d’un morceau, puis ordonne les quatre premiers comme la fusion les laisse.',
    theory: {
      what: 'RRF fusionne deux listes en ne regardant que les rangs : chaque morceau ajoute 1/(k + rang) pour chaque liste où il est.',
      how: [
        'rrf(d) = 1/(60 + rang_lex) + 1/(60 + rang_sem)',
        '1er et 3e -> 1/61 + 1/63 = 0.0323',
        '1er seulement -> 1/61    = 0.0164',
      ],
      when: 'Pour fusionner des listes dont les scores ne sont pas comparables, comme BM25 et le cosinus.',
      whenNot:
        'Si les deux listes viennent du même moteur, additionner leurs scores convient déjà.',
      problems:
        'Additionner BM25 (0 à 20) et cosinus (0 à 1) : le lexical décide de tout. Tu le vois parce que la liste fusionnée est la lexicale. Utilise les rangs.',
    },
    example:
      'Avant de regarder : un morceau est 3e dans une liste et 1er dans l’autre ; un autre est 1er dans une seule. Lequel finit devant ?',
    frames: [
      'On ne regarde pas les scores : seulement le rang de chaque morceau dans chaque liste.',
      'Être dans les deux listes pèse plus que dominer une seule.',
    ],
  },
  'rag-weights': {
    title: 'Poids de l’hybride',
    goal: 'Dans ce corpus, la recherche sémantique touche plus que la lexicale. Règle le poids et le k de RRF pour que chaque réponse entre dans les 3 premiers et monte.',
    theory: {
      what: 'Le poids répartit ce que compte chaque liste : 0, c’est le lexical seul et 1, le sémantique seul. Le k de RRF dit ce que valent les premières places.',
      how: [
        'poids = 0.5   # les deux listes pareil',
        'poids = 0.7   # le sémantique mène',
        'k = 60        # places presque égales',
        'k = 1         # la 1re vaut le double de la 2e',
      ],
      when: 'Quand tu mesures qu’un moteur touche plus que l’autre.',
      whenNot: 'Ne le pousse pas à 0 ou à 1 : ce n’est plus de l’hybride.',
      problems:
        'Régler sur une seule question : elle s’améliore et deux empirent. Vérifie le MRR de l’ensemble.',
    },
    example:
      'Avant de regarder : tu montes le poids du sémantique à 0.7. La question avec d’autres mots va-t-elle monter ou descendre ?',
    frames: [
      'Moitié-moitié (0.5), le bon morceau est cinquième : le lexical en met quatre autres devant.',
      'Avec un poids de 0.7, le sémantique mène et le bon morceau monte à la première place.',
    ],
  },
  'rag-rerank': {
    title: 'Reclassement',
    goal: 'Mets le bon morceau en premier pour chaque question en ne reclassant que le nombre de candidats nécessaire : chacun coûte du temps.',
    theory: {
      what: 'Le reclassement note de nouveau les meilleurs candidats avec un modèle plus lent qui lit la question et le morceau ensemble, et les réorganise.',
      how: [
        'candidats = hybride(question, 20)',
        'meilleurs = reclasser(question, candidats[:5])',
        'top = meilleurs[:k]   # 5 lectures de plus',
      ],
      when: 'Quand le bon morceau est d’habitude près du sommet mais pas premier : ça monte le MRR sans toucher à l’index.',
      whenNot:
        'Si la latence prime, ou si le bon morceau n’arrive jamais parmi les candidats : le reclassement ne trouve pas, il réorganise.',
      problems:
        'Reclasser 20 au cas où : la latence triple sans gain. Compare « Latence » avec le MRR et garde la profondeur minimale.',
    },
    example:
      'Avant de regarder : le bon morceau est troisième et un lecteur plus lent note de nouveau les 5 premiers. Où finira-t-il ?',
    frames: [
      'Sans reclassement, le bon morceau est troisième, derrière deux qui lui ressemblent seulement.',
      'En reclassant 5, le lecteur le lit à côté de la question et le met en premier.',
    ],
  },
  'rag-boss-lists': {
    title: 'Deux moteurs, une liste',
    goal: 'Laisse un seul retriever qui touche les noms exacts et les questions avec d’autres mots, avec le bon morceau en tête et dans la latence.',
    story:
      'L’équipe se dispute depuis une semaine dans un thread : le backend veut BM25 « parce qu’il trouve les fonctions », le produit veut des embeddings « parce qu’il comprend les gens ». Ta manager clôt le thread : « une liste, mesurée, avant le déjeuner ».',
    tasks: [
      'Montre avec une somme pourquoi celui qui est dans les deux listes gagne : le score RRF d’un morceau.',
      'Monte le retriever : le bon morceau en premier pour toutes, avec la latence la plus basse qui y arrive.',
    ],
  },
  'rag-budget': {
    title: 'Budget de tokens',
    goal: 'Avec 80 tokens, presque rien ne tient dans le prompt. Règle k et le budget pour que le bon morceau entre toujours, en dépensant juste ce qu’il faut.',
    theory: {
      what: 'Le prompt contient les instructions, les morceaux et la question. Le budget, c’est le nombre de tokens que tu autorises : ce qui ne tient pas n’est pas lu.',
      how: [
        'utilisés = tokens(instructions) + tokens(question)',
        'pour chaque morceau, du meilleur au pire :',
        '    si utilisés + tokens(morceau) > budget : stop',
        '    ajouter le morceau ; utilisés += tokens(morceau)',
      ],
      when: 'Toujours : un petit modèle a une fenêtre courte.',
      whenNot: 'Ne le remplis pas parce que ça rentre : plus de contexte, c’est plus de latence.',
      problems:
        'Petit budget avec un k élevé : tu en récupères 5 et 1 entre. Le banc l’affiche comme « Perdue dans le prompt ». Augmente le budget ou baisse la taille des morceaux.',
    },
    example:
      'Avant de regarder : les instructions et la question prennent environ 30 tokens et chaque morceau environ 25. Combien de morceaux tiennent dans 80 ?',
    frames: [
      'Avec 80 tokens, un morceau entre ; les deux autres restent dehors, et la réponse avec eux.',
      'Avec 150, les trois morceaux récupérés tiennent et le bon arrive au modèle.',
    ],
  },
  'rag-fits': {
    title: 'Compter ce qui tient',
    goal: 'Fais à la main la somme du constructeur : combien de morceaux entrent dans le prompt avec deux budgets différents.',
    theory: {
      what: 'Construire le prompt est une somme : la partie fixe plus chaque morceau, dans l’ordre, tant que ça reste dans le budget. Le premier qui ne rentre pas coupe.',
      how: [
        'fixe = 20 + tokens(question)',
        'fixe + t1 <= budget        # le 1er entre',
        'fixe + t1 + t2 <= budget   # le 2e entre',
        'le 3e dépasse -> lui et les suivants restent dehors',
      ],
      when: 'Pour choisir la taille des morceaux et k avec des chiffres.',
      whenNot: 'En production, compte avec le tokeniseur de ton modèle, pas en mots.',
      problems:
        'Oublier la partie fixe et chaque étiquette de source : le dernier morceau reste dehors pour 2 tokens.',
    },
    example:
      'Avant de regarder : le troisième morceau est une classe Python entière et ne rentre pas. Les deux petits derrière lui entreront-ils ?',
    frames: ['La somme, morceau par morceau : elle s’arrête au premier qui dépasserait le budget.'],
  },
  'rag-order': {
    title: 'L’ordre dans le prompt',
    goal: 'Quelqu’un a rempli le prompt du pire morceau au meilleur, et le budget coupe exactement les bons. Change l’ordre pour récupérer les réponses.',
    theory: {
      what: 'L’ordre décide de ce qui reste dehors quand le budget coupe. Du meilleur au pire, tu perds ce qui comptait le moins.',
      how: [
        'ordre = "meilleur d’abord"   # coupe par la queue',
        'ordre = "pire d’abord"       # coupe les meilleurs',
        'ordre = "par fichier"        # coupe au hasard',
      ],
      when: 'Dès qu’il y a un budget : remplis par score.',
      whenNot:
        'Mettre le meilleur à côté de la question est bien après avoir choisi ce qui entre, pas pour remplir.',
      problems:
        'Inverser la liste avant d’appliquer le budget : le meilleur est le premier à tomber. Tu verras « Perdue dans le prompt ».',
    },
    example:
      'Avant de regarder : 5 morceaux, 3 tiennent et ils entrent du pire au meilleur. Lesquels restent dehors ?',
    frames: [
      'Du pire au meilleur : les trois pires entrent et le budget laisse dehors les deux meilleurs.',
      'Du meilleur au pire : ce qui reste dehors est ce qui apportait le moins.',
    ],
  },
  'rag-boss-budget': {
    title: 'Le contexte ne tient pas',
    goal: 'Fais tenir le prompt du bot dans la fenêtre du petit modèle sans perdre le morceau qui répond.',
    story:
      'Pour économiser, l’équipe est passée à un minuscule modèle local. Depuis, le bot dit « je ne sais pas » une fois sur deux : le prompt était conçu pour une fenêtre quatre fois plus grande, avec 8 morceaux entassés du pire au meilleur.',
    tasks: [
      'Fais la somme : combien des 5 morceaux récupérés tiennent dans 110 tokens.',
      'Règle k, le budget et l’ordre : le bon morceau toujours dedans, en dépensant juste ce qu’il faut.',
    ],
  },
  'rag-grounded': {
    title: 'Ancrage et citations',
    goal: 'Quand la recherche échoue, ce bot complète de mémoire, et quand elle touche il ne dit pas d’où ça vient. Fais qu’il n’invente rien et cite ses sources.',
    theory: {
      what: 'Générer avec ancrage, c’est exiger qu’il réponde seulement avec le contexte et dise de quelle source ça vient. Pour citer, les sources sont numérotées.',
      how: [
        '"Réponds seulement avec les sources."',
        '"Cite ainsi : [n]. Si ce n’est pas dedans : Je ne sais pas."',
        '[1] docs/reintentos.md:3-5',
        'Por defecto cada tarea se reintenta 5 veces. [1]',
      ],
      when: 'Chaque fois que quelqu’un va faire confiance à la réponse.',
      whenNot: 'Une citation ne prouve rien si personne n’ouvre la source : mesure-le.',
      problems:
        'Le laisser compléter « avec ce qu’il sait » : si la recherche échoue, sort une donnée périmée sans citation. Le banc compte « Inventées ».',
    },
    example:
      'Avant de regarder : la recherche ne trouve rien d’utile et le modèle peut compléter tout seul. Que répondra-t-il ?',
    frames: [
      'Sans exiger l’ancrage : le contexte n’aide pas, alors il utilise la mémoire et ne cite rien.',
      'En l’exigeant et en numérotant les sources : soit il répond avec sa citation, soit il avoue qu’il ne sait pas.',
    ],
  },
  'rag-idk': {
    title: 'Savoir dire « je ne sais pas »',
    goal: 'Deux de ces questions n’ont pas de réponse dans la documentation. Monte la barre jusqu’à ce que le bot l’avoue, sans qu’il se taise sur le reste.',
    theory: {
      what: 'L’appui minimal, c’est à quel point le contexte doit soutenir une réponse pour qu’elle soit donnée. En dessous, le bot dit « je ne sais pas » au lieu de ce qui y ressemble le plus.',
      how: [
        'meilleure = phrase_la_plus_appuyée(contexte)',
        'si appui(meilleure) < minimum :',
        '    répondre("Je ne sais pas")',
        'sinon : répondre(meilleure, citation)',
      ],
      when: 'Dans tout bot qui sert des gens : une fausse réponse avec citation coûte plus cher qu’un « je ne sais pas ».',
      whenNot: 'Une barre très haute fait taire de bonnes réponses.',
      problems:
        'Barre à 1 : un morceau partage toujours un mot. À « Combien coûte la licence ? », il répond une phrase d’installation, avec une citation. Monte-la en mesurant.',
    },
    example:
      'Avant de regarder : quelqu’un demande ce que coûte la licence et aucun document ne parle de prix. Avec la barre à 1, que fera le bot ?',
    frames: [
      'Barre à 1 : il répond avec la phrase qui y ressemble le plus, sans aucun rapport.',
      'Barre à 3 : aucune phrase ne l’atteint, et il avoue qu’il ne sait pas.',
    ],
  },
  'rag-filler': {
    title: 'Contexte de remplissage',
    goal: 'Ce prompt transporte 10 morceaux « pour qu’il ne manque rien ». Ne garde que ceux qu’il faut : toutes les réponses justes et plus de morceaux utiles par morceau récupéré.',
    theory: {
      what: 'Le remplissage, ce sont les morceaux qui entrent dans le prompt sans contenir la réponse : ils dépensent du budget et donnent au modèle des phrases semblables sur lesquelles trébucher.',
      how: [
        'k = 10  # 1 bon morceau et 9 de remplissage',
        'k = 5   # le bon et peu d’autre chose',
        'précision = bons / récupérés',
      ],
      when: 'Vérifie la précision chaque fois que tu montes k.',
      whenNot: 'Ne baisse pas k jusqu’à perdre des réponses : le rappel d’abord.',
      problems:
        'Croire que plus de contexte est plus sûr. Avec 10 morceaux et peu de budget, le bon reste dehors. Baisse k et ordonne-les.',
    },
    example:
      'Avant de regarder : tu récupères 10 morceaux et un seul contient la réponse. Quelle précision est-ce ?',
    frames: [
      'Avec k = 10, un morceau sur dix est utile et le budget part dans le reste.',
      'Avec k = 5 et du meilleur au pire, chaque réponse sort et la moitié du remplissage a disparu.',
    ],
  },
  'rag-boss-proof': {
    title: 'Répondre, mais avec preuve',
    goal: 'Laisse un bot qui n’invente pas, cite ce qu’il dit, avoue ce qu’il ne sait pas et ne porte pas de remplissage.',
    story:
      'Le juridique a vu la capture du lundi et posé des conditions pour rouvrir le bot aux clients : pas de réponses inventées, chacune avec sa source et un « je ne sais pas » quand ce n’est pas dans la documentation. Audit demain avec des questions pièges.',
    tasks: [
      'Ancrage, citations et barre : rien d’inventé, tout cité et « je ne sais pas » sur les questions pièges.',
      'Dehors le remplissage : chaque réponse juste avec moins de morceaux, mieux ordonnés.',
    ],
  },
  'rag-final-intermediate': {
    title: 'Le bot de support, comme il faut',
    goal: 'Construis tout le pipeline, de la recherche à la réponse, et passe-le sur des questions que personne dans l’équipe n’a vues.',
    story:
      'Le bot de support rouvre et cette fois tu le construis de bout en bout. Tu as la recherche lexicale du premier jour, un prompt sans budget réfléchi et un générateur qui répond à tout. Le support a gardé de nouvelles questions pour le test final.',
    tasks: [
      'Récupération : hybride avec le bon morceau en tête, sans que la latence explose.',
      'Prompt : le bon morceau toujours dedans, en dépensant juste ce qu’il faut.',
      'Réponse : sur les nouvelles questions, rien d’inventé, tout cité et « je ne sais pas » quand il faut.',
    ],
  },
}
