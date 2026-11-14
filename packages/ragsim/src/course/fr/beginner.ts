/**
 * Nivel principiante en francés. Mismas partes, mismas líneas de ejemplo y
 * mismos pasos que en inglés; el código, los números y las frases del corpus
 * (en castellano, como en el resto de idiomas) no se tocan.
 */

import type { UnitText } from '../types.js'

export const BEGINNER_FR: Record<string, UnitText> = {
  'rag-why': {
    title: 'Chercher avant de répondre',
    goal: 'Fais répondre le bot aux trois questions en lisant la documentation, sans en inventer aucune.',
    theory: {
      what: 'Le RAG cherche dans tes documents les morceaux qui comptent et les donne au modèle avec la question. Le modèle répond en lisant, pas de mémoire.',
      how: [
        'morceaux = chercher(question, k=3)    # dans ton corpus',
        'prompt = monter(morceaux, question)   # contexte + question',
        'réponse = modèle(prompt)              # et il cite la source',
      ],
      when: 'Quand le modèle ne peut pas le savoir : documentation interne, code de ton équipe ou données qui changent chaque semaine.',
      whenNot:
        'Si la réponse relève de la culture générale ou tient entière dans le prompt, chercher n’ajoute que de la latence et des endroits où échouer.',
      problems:
        'Croire que le modèle « sait déjà ». Sans contexte, il répond avec aplomb une donnée périmée, et le banc la marque « Inventée ». Active le contexte.',
    },
    example:
      'Avant de regarder : Colmena réessaie 5 fois, mais le modèle a appris avec la version 1. Sans contexte, que dira-t-il ?',
    frames: [
      'Sans contexte, il répond de mémoire : une donnée de la version 1, dite avec une grande assurance.',
      'Avec contexte, il lit le bon morceau et répond avec sa citation.',
    ],
  },
  'rag-corpus': {
    title: 'Ce qu’on charge',
    goal: 'Quelqu’un a indexé tout le dépôt. Ne garde que ce qui répond aux questions : pas de secrets, pas de bruit.',
    theory: {
      what: 'Le corpus, c’est ce que ton RAG peut trouver. Charger, c’est choisir quels fichiers entrent : tout ce que tu indexes peut finir dans une réponse.',
      how: [
        'docs/*.md, README.md  # guides : oui',
        'src/**/*.py           # code : oui',
        'poetry.lock           # bruit : non',
        '.env                  # secrets : jamais',
      ],
      when: 'Au début et chaque fois que le dépôt gagne un nouveau dossier : tu décides par extension et par chemin.',
      whenNot: 'Ne filtre pas trop : sans src/, le bot ne peut pas dire où vit une fonction.',
      problems:
        'Tout indexer « au cas où ». Tu le vois parce que « Secrets dans l’index » n’est pas à 0 et que le .env apparaît comme source d’une réponse. Retire ces sources.',
    },
    example:
      'Avant de regarder : avec le .env indexé, tu demandes quelle variable contient l’adresse de Redis. Quelle source arrive selon toi dans le prompt ?',
    frames: [
      'Avec tout chargé : 1 morceau avec des secrets, du bruit venant du .lock et une visée moins précise.',
      'Le .env arrive dans le prompt : le mot de passe de production est à une question de fuiter.',
      'Guides et code seulement : moins de morceaux, pas de secrets et plus de réussites.',
    ],
  },
  'rag-chunk-size': {
    title: 'Découpage : la taille',
    goal: 'Des morceaux de 10 mots coupent les réponses. Trouve une taille qui les garde entières sans remplir le prompt.',
    theory: {
      what: 'Le découpage coupe chaque document en morceaux qui s’indexent et se récupèrent séparément. Le découpage fixe coupe tous les N mots, où que ça tombe.',
      how: [
        'decouper(doc, taille=10)   # phrases cassées',
        'decouper(doc, taille=50)   # phrases entières',
        'decouper(doc, taille=200)  # la moitié d’un document',
      ],
      when: 'Toujours : un document entier ne tient pas dans le prompt, et un seul vecteur pour lui ne peut pas dire de quoi parle chaque paragraphe.',
      whenNot:
        'Plus grand n’est pas mieux : trois énormes morceaux dépensent le prompt en remplissage et enterrent la réponse.',
      problems:
        'Morceaux trop petits : la phrase qui contient la réponse finit en deux moitiés et aucune ne touche. Le banc le dit : « Perdue au découpage ». Augmente la taille.',
    },
    example:
      'Avant de regarder : la réponse tient en 8 mots et les morceaux font 10 mots. Restera-t-elle entière dans l’un d’eux ?',
    frames: [
      'Avec des morceaux de 10 mots, la phrase de la réponse est à cheval sur deux d’entre eux.',
      'Avec des morceaux de 50 mots, la phrase est entière dans un seul et peut être récupérée.',
    ],
  },
  'rag-chunk-overlap': {
    title: 'Découpage : le chevauchement',
    goal: 'Sans changer la taille (30 mots), utilise le chevauchement pour que les phrases coupées restent entières, avec le moins de morceaux possible.',
    theory: {
      what: 'Le chevauchement répète la fin de chaque morceau au début du suivant. Ce qu’une coupure partage en deux reste entier dans l’un des deux.',
      how: [
        'decouper(doc, 30, chevauchement=0)   # 0-30, 30-60…',
        'decouper(doc, 30, chevauchement=10)  # 0-30, 20-50…',
      ],
      when: 'Avec le découpage fixe, quand tu vois des réponses coupées pile à la frontière entre deux morceaux.',
      whenNot:
        'Le chevauchement n’est pas gratuit : avec 10 sur 30, un tiers de l’index est répété. Plus de morceaux, c’est plus de mémoire et plus de calcul.',
      problems:
        'Trop de chevauchement : les premières places se remplissent de morceaux presque identiques qui en chassent d’autres. Tu le vois parce que « Morceaux dans l’index » explose. Prends le minimum qui répare les coupures.',
    },
    example:
      'Avant de regarder : avec des morceaux de 30 mots et un chevauchement de 10, à combien de mots d’écart commencent les nouveaux morceaux ?',
    frames: [
      'Sans chevauchement, la coupure tombe en pleine phrase et aucun morceau ne la contient entière.',
      'Avec un chevauchement de 10, le morceau suivant commence 10 mots plus tôt et la récupère entière.',
    ],
  },
  'rag-chunk-structure': {
    title: 'Découpage par structure',
    goal: 'Fais en sorte que chaque réponse reste entière, avec une meilleure visée que le découpage fixe et un prompt plus court.',
    theory: {
      what: 'Le découpage par structure coupe là où l’auteur l’a déjà fait : un morceau par section en Markdown et un par fonction ou classe en Python.',
      how: [
        'docs/colas.md  # un morceau par "## …"',
        'src/retry.py   # un par def ou class',
        'longue section # coupée avec taille et chevauchement',
      ],
      when: 'Chaque fois que le document a une forme : guides avec titres, code, FAQ. Chaque morceau parle d’une seule chose.',
      whenNot:
        'Un log ou un texte sans titres n’a pas de structure à suivre : utilise là le découpage fixe avec chevauchement.',
      problems:
        'Oublier le plafond : une classe de 300 lignes dans un seul morceau ne tient pas dans le prompt. Le banc affiche « Tokens du prompt » au-dessus de l’objectif. Fixe une taille maximale.',
    },
    example:
      'Avant de regarder : deploy.md a quatre courtes sections. Avec des fenêtres fixes de 30 mots, les coupures tomberont-elles sur les titres ?',
    frames: [
      'Découpage fixe : la fenêtre coupe où elle tombe et sépare la phrase sur le port.',
      'Par structure : chaque section est un morceau, avec son titre et sa réponse entière.',
    ],
  },
  'rag-boss-invents': {
    title: 'Le bot de support invente ses réponses',
    goal: 'Laisse le bot de support de Colmena répondre avec la documentation sous les yeux, avec un corpus propre et des morceaux qui ne coupent pas les réponses.',
    story:
      'Lundi, 9 h 10. Le support transmet une capture : le bot a dit à un client que Colmena réessaie 3 fois. C’est 5 depuis la version 2. Quelqu’un l’a déployé vendredi sans contexte, et a aussi essayé d’indexer tout le dépôt « pour qu’il en sache plus ».',
    tasks: [
      'Active le contexte et ne garde dans le corpus que les guides et le code : pas de secrets, pas de bruit.',
      'Répare le découpage : chaque réponse entière, une bonne visée et un prompt court.',
    ],
  },
  'rag-tokens': {
    title: 'Tokens et normalisation',
    goal: 'On tape vite : sans accents, en majuscules, au pluriel. Fais que ces cinq requêtes trouvent leur réponse en première place.',
    theory: {
      what: 'Tokeniser transforme le texte en mots qu’on compare. Normaliser retire les différences qui ne comptent pas : casse, accents, pluriels et mots vides.',
      how: [
        '"Límite de Tamaño" -> limite, tamano  # normaliser',
        '"MAX_RETRIES"      -> max, retries    # découper',
        '"de", "la", "the"  -> retirés         # mots vides',
        '"colas", "cola"    -> cola            # racinisation',
      ],
      when: 'Toujours, et avec le même tokeniseur à l’indexation et à la recherche : sinon les mots ne correspondent pas.',
      whenNot:
        'Une racinisation trop forte fusionne des mots différents. Et dans le code, la casse et les underscores sont aussi des indices : garde l’identifiant entier en plus de ses parties.',
      problems:
        'Comparer tel quel. "LIMITE DE TAMANO" ne trouve pas "Límite de tamaño" et la liste lexicale revient vide. Active la normalisation.',
    },
    example:
      'Avant de regarder : le document dit "Límite de tamaño" et quelqu’un cherche "LIMITE DE TAMANO". Sans normaliser, combien de mots partagent-ils ?',
    frames: [
      'Sans normaliser, ils ne partagent aucun mot : la recherche ne renvoie pas son morceau.',
      'Avec normalisation et racinisation, les trois mots correspondent et son morceau arrive en premier.',
    ],
  },
  'rag-tfidf': {
    title: 'TF et IDF',
    goal: 'Avec les 7 morceaux de deux guides sous les yeux, compte à la main : un TF, un DF et deux IDF.',
    theory: {
      what: 'Le TF, c’est le nombre de fois où un terme apparaît dans un morceau. L’IDF, c’est à quel point il distingue les morceaux : élevé s’il est dans peu de morceaux, proche de zéro s’il est dans tous.',
      how: [
        'tf("cola", morceau) = nombre de fois où il y apparaît',
        'df("cola") = morceaux qui le contiennent',
        'idf = ln(1 + (N - df + 0.5) / (df + 0.5))',
        'poids = tf * idf   # le cœur de BM25',
      ],
      when: 'Pour comprendre pourquoi un morceau gagne : il partage avec la requête des mots rares, pas des mots fréquents.',
      whenNot:
        'Le TF seul récompense celui qui répète le plus ; l’IDF seul ignore le morceau. Il faut les deux.',
      problems:
        'Donner à tous les mots le même poids. "tarea" est dans presque tous les morceaux : son IDF est très bas et il ne classe presque rien. Le mot rare décide.',
    },
    example:
      'Avant de regarder : sur 7 morceaux, "tarea" apparaît dans 6. Son IDF sera-t-il élevé ou bas ?',
    frames: [
      '"tarea" est presque partout : son IDF est bas et il distingue à peine les morceaux.',
      '"exponencial" est dans un seul morceau : son IDF est élevé et il décide du gagnant.',
    ],
  },
  'rag-bm25': {
    title: 'BM25 : k1 et b',
    goal: 'Cet index contient un fichier qui répète des mots-clés et tu ne peux pas le retirer. Règle k1 et b pour que les bons morceaux remontent en tête.',
    theory: {
      what: 'BM25 additionne, pour chaque mot de la requête, son IDF multiplié par un TF qui sature. k1 dit combien la répétition ajoute encore ; b, à quel point on pénalise les longs morceaux.',
      how: [
        'k1 = 0    # une fois ou dix : pareil',
        'k1 = 3    # répéter ajoute beaucoup',
        'b = 0     # la longueur ne compte pas',
        'b = 1     # les longs morceaux valent moins',
      ],
      when: 'Les valeurs par défaut (k1 = 1.2, b = 0.75) suffisent presque toujours. Touche-les quand tu mesures un problème précis.',
      whenNot:
        'Si le problème est un fichier de bruit, le retirer du corpus vaut mieux que régler. Ceci, c’est pour quand tu ne peux pas.',
      problems:
        'Un k1 élevé avec du texte répétitif : gagne celui qui dit le plus le mot, pas celui qui répond. Tu verras le .lock en premier dans la liste lexicale. Baisse k1.',
    },
    example:
      'Avant de regarder : un morceau du .lock dit "reintentos" quatre fois et le guide, deux. Avec k1 = 3, qui gagne ?',
    frames: [
      'Avec k1 = 3, la répétition compte beaucoup : le morceau de bruit prend la première place.',
      'Avec k1 = 0.4, la répétition sature vite et le guide reprend sa place.',
    ],
  },
  'rag-topk': {
    title: 'Combien de résultats : k',
    goal: 'Avec k = 1, tu rates les réponses en deuxième ou troisième place. Monte k juste ce qu’il faut : plus de réussites sans trop allonger le prompt.',
    theory: {
      what: 'k, c’est combien de morceaux tu gardes de la liste classée. Un k élevé rend plus probable que le bon y soit (rappel) et amène plus de remplissage autour (précision).',
      how: [
        'chercher(question, k=1)   # réussite ou rien',
        'chercher(question, k=3)   # marge raisonnable',
        'chercher(question, k=10)  # presque tout… et beaucoup de remplissage',
      ],
      when: 'Choisis k en regardant où tombe d’habitude le bon morceau : s’il est presque toujours dans les 3 premiers, k = 3.',
      whenNot:
        'Monter k ne répare pas une mauvaise recherche : si le bon morceau est en 15e place, c’est le moteur de recherche qui échoue.',
      problems:
        'Demander k = 10 « au cas où » : le rappel monte un peu, la précision tombe à 0.10 et le prompt triple. Regarde les deux chiffres ensemble.',
    },
    example: 'Avant de regarder : tu passes de k = 1 à k = 10. Que devient la précision ?',
    frames: [
      'k = 1 : précision élevée, mais les réponses en deuxième et troisième place restent dehors.',
      'k = 3 : presque toutes entrent avec un prompt modéré.',
      'k = 10 : à peine plus de réussites, un bon morceau sur dix et deux fois plus de tokens.',
    ],
  },
  'rag-boss-wiki': {
    title: 'Personne ne trouve rien dans le wiki',
    goal: 'Fais en sorte que la recherche lexicale du wiki trouve ce que les gens tapent vraiment, même avec du bruit dans l’index.',
    story:
      'Le canal #help est plein de « la recherche ne trouve rien ». Tu regardes le log : des requêtes en majuscules et sans accents, une recherche qui compare lettre à lettre et, depuis hier, les dépendances indexées parce que quelqu’un voulait « chercher des versions ».',
    tasks: [
      'Fais que les requêtes tapées vite trouvent leur réponse en première place.',
      'Calcule l’IDF de "reintentos" dans les deux guides : distingue-t-il les morceaux ou non ?',
      'Avec le bruit à l’intérieur, règle k1, b et k : les bons en tête et un prompt court.',
    ],
  },
  'rag-embed': {
    title: 'Embeddings',
    goal: 'Calcule trois dimensions de l’embedding d’une phrase du guide : à quel point elle parle d’attendre, de réessayer et de temps.',
    theory: {
      what: 'Un embedding transforme un texte en vecteur : une liste de nombres qui dit de quoi il parle. Des textes de même sens donnent des vecteurs proches, même sans mot en commun.',
      how: [
        'v = embed("volver a intentarlo")',
        '# ici : une dimension par concept',
        '# réessayer : 2, attendre : 0, échouer : 0…',
        '# un vrai modèle : 384 nombres appris',
      ],
      when: 'Quand la personne qui demande n’emploie pas les mots du document : synonymes, une autre formulation ou une autre langue.',
      whenNot:
        'Un identifiant exact (QueueFull, un port) ne « signifie » rien pour le modèle : la recherche lexicale gagne là.',
      problems:
        'Croire que le vecteur garde les mots. "reintento" et "retry" tombent sur la même dimension : on ne peut pas savoir lequel disait le texte. Garde le morceau à côté de son vecteur.',
    },
    example:
      'Avant de regarder : "volver a intentarlo" ne contient pas le mot "reintento". Quelle sera sa dimension « réessayer » ?',
    frames: [
      '"volver a" et "intentarlo" nomment le même concept : la dimension vaut 2 sans partager un seul mot avec le guide.',
    ],
  },
  'rag-cosine': {
    title: 'Similarité cosinus',
    goal: 'Calcule le cosinus entre la question et deux phrases du guide, et vois laquelle est son plus proche voisin.',
    theory: {
      what: 'Le cosinus mesure si deux vecteurs pointent dans la même direction : 1 s’ils parlent des mêmes choses dans les mêmes proportions, 0 s’ils ne partagent aucun concept.',
      how: [
        'cos(a, b) = a·b / (|a| * |b|)',
        'a·b = a1*b1 + a2*b2 + …',
        '|a| = sqrt(a1² + a2² + …)',
        'top = les k morceaux au cosinus le plus élevé',
      ],
      when: 'Pour classer les morceaux selon leur ressemblance avec la question : les k au cosinus le plus élevé sont ses plus proches voisins.',
      whenNot:
        'Ne compare pas des cosinus avec des scores BM25 : ce sont des échelles différentes. Pour fusionner les deux listes, tu utilises les rangs.',
      problems:
        'Utiliser le produit scalaire sans diviser : un long morceau gagne juste parce qu’il a de plus grands nombres. Divise par les longueurs (ou normalise les vecteurs quand tu les stockes).',
    },
    example:
      'Avant de regarder : deux textes avec les vecteurs (1, 1, 0) et (2, 2, 0). L’un est deux fois plus long. Quel est leur cosinus ?',
    frames: [
      'Ils pointent exactement dans la même direction : le cosinus vaut 1 même si l’un est deux fois plus long.',
    ],
  },
  'rag-semantic': {
    title: 'Recherche sémantique',
    goal: 'Ces questions utilisent d’autres mots, ou l’autre langue, que la documentation. Fais que toutes trouvent leur réponse dans les 3 premiers.',
    theory: {
      what: 'La recherche sémantique transforme la question en vecteur et renvoie les morceaux au cosinus le plus élevé. Elle trouve par le sens, pas par les mots.',
      how: [
        'vecteurs = embed(morceaux)       # une fois, à l’indexation',
        'q = embed(question)              # à chaque requête',
        'top = cosinus_max(q, vecteurs, k=3)',
      ],
      when: 'Avec des questions de vraies personnes : « pourquoi ça a tourné deux fois ? » face à un document qui dit « tâches dupliquées ».',
      whenNot:
        'Elle échoue avec les noms exacts : "backoff_seconds" n’est pas un concept et son morceau ne vient pas en premier. Il te faut encore BM25 pour ça.',
      problems:
        'Rester sur BM25 parce que « ça marche dans mes tests » (écrits avec tes mots). Avec ceux de quelqu’un d’autre, la liste lexicale revient vide. Mesure avec des paraphrases.',
    },
    example:
      'Avant de regarder : « Why did my job run twice? » face à un guide en espagnol. Que trouvera BM25 ?',
    frames: [
      'BM25 ne trouve rien d’utile : la question et le guide ne partagent aucun mot.',
      'La recherche sémantique lit "job", "run" et "twice" comme tâche, exécution et deux fois, et touche.',
    ],
  },
  'rag-boss-words': {
    title: 'La requête avec d’autres mots',
    goal: 'Montre avec des chiffres pourquoi le bot ne comprend pas les gens qui demandent en anglais, et répare-le.',
    story:
      'Le bureau de Lisbonne écrit en anglais et la moitié des guides sont en espagnol. « Ton bot ne sait rien », disent-ils. Ton collègue veut une preuve avant de changer la recherche : un cosinus calculé à la main et la mesure avant et après.',
    tasks: [
      'Calcule à quel point la phrase du guide parle du concept « deux fois » et son cosinus avec la question en anglais.',
      'Change la recherche pour que les questions avec d’autres mots touchent dans les 3 premiers.',
    ],
  },
  'rag-final-beginner': {
    title: 'Ton premier moteur de recherche',
    goal: 'Construis de zéro la recherche dans la documentation de Colmena : corpus, découpage, tokens et la recherche qui trouve le mieux.',
    story:
      'Tu reçois la première « vraie » tâche de l’équipe : la recherche dans la documentation. L’existant est un prototype d’un après-midi : il indexe tout, coupe tous les 15 mots, compare lettre à lettre et ne renvoie qu’un résultat. La démo est à 12 h.',
    tasks: [
      'Corpus et découpage : pas de secrets, pas de bruit, et chaque réponse entière.',
      'Tokens : fais que les requêtes tapées vite trouvent leur réponse en première place.',
      'Recherche : choisis le moteur et le k qui touchent le plus de questions de vraies personnes sans allonger le prompt.',
    ],
  },
}
