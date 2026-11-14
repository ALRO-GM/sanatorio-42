/**
 * Los bloques del curso de RAG en francés: título, resumen y la pieza de tu
 * propio RAG (el esqueleto en Python conserva el código; solo se traducen
 * los comentarios y las frases de ejemplo).
 */

import type { BlockText } from '../types.js'

export const BLOCKS_FR: Record<number, BlockText> = {
  1: {
    title: 'Le RAG et le corpus',
    pitch: 'Pourquoi chercher avant de répondre, ce qu’on charge et comment on le découpe.',
    build: {
      piece:
        'Le chargeur et le découpeur : d’un dossier à une liste de morceaux avec leur chemin et leurs lignes.',
      skeleton: [
        'def load_documents(root, extensions=(".md", ".py")):',
        '    # parcourt root ; saute .env, *.lock et tout ce qui n’est pas du texte',
        '    # renvoie [(chemin, texte)]',
        '',
        'def chunk(path, text, max_size):',
        '    # .md : coupe à chaque titre ; .py : à chaque def/class (ast)',
        '    # si une section dépasse max_size, coupe-la avec un peu de chevauchement',
        '    # chaque morceau garde chemin, première et dernière ligne, et son texte',
      ],
      verify:
        'Affiche combien de morceaux sortent et le plus long. Cherche à la main trois phrases dont tu sais qu’elles répondent à quelque chose : chacune doit être entière dans un morceau.',
    },
  },
  2: {
    title: 'Recherche lexicale',
    pitch: 'Tokens, TF, IDF et BM25 : trouver par les mots qu’on partage.',
    build: {
      piece: 'Le tokeniseur et l’index BM25 sur tes morceaux.',
      skeleton: [
        'def tokenize(text):',
        '    # minuscules, sans accents ; découpe snake_case et camelCase',
        '    # retire les mots vides ; rogne les pluriels',
        '',
        'class BM25Index:',
        '    def __init__(self, chunks, k1=1.2, b=0.75):',
        '        # tf par morceau, df par terme, longueur moyenne',
        '    def search(self, query, k):',
        '        # somme idf * tf*(k1+1) / (tf + k1*(1 - b + b*longueur/moyenne))',
        '        # renvoie les k meilleurs (morceau, score)',
      ],
      verify:
        'Cherche le nom exact d’une fonction de ton dépôt : son morceau doit arriver en premier. Change k1 et b et vérifie que l’ordre change.',
    },
  },
  3: {
    title: 'Recherche sémantique',
    pitch: 'Embeddings et cosinus : trouver même quand la question emploie d’autres mots.',
    build: {
      piece: 'L’index sémantique : un vecteur par morceau et la recherche par cosinus.',
      skeleton: [
        'model = SentenceTransformer("all-MiniLM-L6-v2")  # petit, sur CPU',
        '',
        'def build_semantic(chunks):',
        '    # vectors = model.encode(texts, normalize_embeddings=True)',
        '    # enregistre la matrice sur disque : la calculer est la partie coûteuse',
        '',
        'def semantic_search(query, k):',
        '    # q = model.encode([query], normalize_embeddings=True)',
        '    # avec des vecteurs normalisés, cosinus = produit scalaire',
        '    # renvoie les k morceaux au cosinus le plus élevé',
      ],
      verify:
        'Demande la même chose avec d’autres mots (ou dans une autre langue) et compare avec BM25 : la recherche sémantique doit trouver le morceau que la lexicale ne voit pas.',
    },
  },
  4: {
    title: 'Hybride et reclassement',
    pitch: 'RRF fusionne les deux listes et un reclasseur affine les premières places.',
    build: {
      piece: 'Le retriever hybride : fusion des rangs et, si ça vaut le coup, reclassement.',
      skeleton: [
        'def rrf(lexical, semantic, weight=0.5, k=60):',
        '    # score[chunk] += (1 - weight) / (k + rang_lexical)',
        '    # score[chunk] += weight / (k + rang_semantic)',
        '    # trie par score, du plus élevé au plus bas',
        '',
        'def retrieve(query, k, rerank_depth=0):',
        '    # demande ~20 à chaque moteur et fusionne-les',
        '    # optionnel : reclasse les rerank_depth premiers (cross-encoder)',
        '    # renvoie les k premiers',
      ],
      verify:
        'Avec une question à identifiant exact et une avec d’autres mots, l’hybride doit réussir les deux. Mesure le temps que ça prend avec et sans reclassement.',
    },
  },
  5: {
    title: 'Le prompt',
    pitch: 'Budget de tokens, ordre des morceaux et sources numérotées.',
    build: {
      piece:
        'Le constructeur du prompt : instructions, sources numérotées et question, dans le budget.',
      skeleton: [
        'def build_prompt(question, chunks, budget):',
        '    # used = tokens(INSTRUCTIONS) + tokens(question)',
        '    # parcours les morceaux du meilleur au pire :',
        '    #   si used + tokens(chunk) > budget : stop',
        '    #   ajoute "[n] chemin:lignes" et le texte ; ajoute à used',
        '    # termine par la question',
        '    # renvoie le prompt et les sources qui y sont entrées',
      ],
      verify:
        'Avec un petit budget, le morceau le mieux noté doit rester dedans. Compte les tokens avec le tokeniseur de ton modèle, pas à l’œil.',
    },
  },
  6: {
    title: 'Génération ancrée',
    pitch:
      'Répondre seulement avec le contexte, citer la source et savoir dire « je ne sais pas ».',
    build: {
      piece:
        'Le générateur : le modèle local répond avec des citations ou avoue qu’il ne sait pas.',
      skeleton: [
        'INSTRUCTIONS = (',
        '    "Réponds seulement avec les sources. Cite ainsi : [n]. "',
        '    "Si ce n’est pas dans les sources, dis : Je ne sais pas."',
        ')',
        '',
        'def answer(question, k):',
        '    # chunks = retrieve(question, k)',
        '    # si le meilleur morceau est sous un minimum : "Je ne sais pas"',
        '    # text = llm(build_prompt(question, chunks, budget))',
        '    # renvoie le texte et les sources citées (chemin et lignes)',
      ],
      verify:
        'Demande quelque chose que ton corpus ne couvre pas : il doit dire « je ne sais pas ». Pour celles où il répond, ouvre la source citée et vérifie que la phrase y est.',
    },
  },
  7: {
    title: 'Évaluer',
    pitch: 'recall@k, précision et MRR sur un ensemble de référence : mesurer, pas à l’œil.',
    build: {
      piece: 'L’évaluateur : recall@k et MRR de ton retriever face à un ensemble de référence.',
      skeleton: [
        'def is_hit(found, gold):',
        '    # même fichier et les lignes se recouvrent assez',
        '',
        'def evaluate(dataset, k):',
        '    # pour chaque question : found = retrieve(question, k)',
        '    # recall@k : y a-t-il une réussite parmi les k ?',
        '    # mrr : 1 / rang de la première réussite (0 s’il n’y en a pas)',
        '    # renvoie les moyennes et la liste des questions ratées',
      ],
      verify:
        'Un retriever qui renvoie toujours la même chose doit obtenir un recall très bas ; un qui renvoie la réponse de référence, 1. Sinon, l’évaluateur est faux.',
    },
  },
  8: {
    title: 'Régler sans sur-ajuster',
    pitch: 'Fuites de l’ensemble d’évaluation, validation croisée et coût contre bénéfice.',
    build: {
      piece:
        'Le labo : essayer des configurations avec validation croisée et noter ce que coûte chacune.',
      skeleton: [
        'def cross_validate(config, dataset, folds=5):',
        '    # coupe dataset en folds parts ; évalue config sur chacune',
        '    # renvoie la moyenne et à quel point elle varie entre les parts',
        '',
        'def tune(grid, dataset):',
        '    # mets 20 % de côté comme test et ne le regarde pas avant la fin',
        '    # pour chaque config : moyenne de cross_validate et secondes que ça prend',
        '    # choisis la meilleure par moyenne ; à égalité, la moins chère',
        '    # une seule fois : évalue la choisie sur test',
      ],
      verify:
        'L’écart entre dev et test pour la configuration choisie doit être petit. Si dev dit 1.00, cherche la fuite avant de te réjouir.',
    },
  },
  9: {
    title: 'Production',
    pitch: 'Indexation incrémentale, cache, API et diagnostic des pannes étape par étape.',
    build: {
      piece: 'Ce qui en fait un service : indexation incrémentale, un cache et une API HTTP.',
      skeleton: [
        'def index(root):',
        '    # hache chaque fichier ; compare avec le manifeste enregistré',
        '    # ne découpe et ne calcule que ce qui est nouveau ou modifié',
        '    # supprime les morceaux des fichiers disparus ; vide le cache',
        '',
        'def cached_answer(question, k):',
        '    # clé = (question normalisée, k, version de l’index)',
        '',
        '# POST /answer {"query", "k"} -> {"answer", "sources"}',
        '# valide avant de chercher : requête vide ou k hors limites = 422',
      ],
      verify:
        'Change un fichier et réindexe : seuls ses morceaux sont recalculés et la nouvelle réponse sort du premier coup. Répète une question : la deuxième fois prend des millisecondes.',
    },
  },
}
