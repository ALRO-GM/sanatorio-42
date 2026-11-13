/**
 * Los nueve bloques del curso de RAG, por nivel, en el orden en que se
 * construye uno: cargar y trocear, buscar por palabras, buscar por
 * significado, juntar las dos listas, montar el prompt, responder con
 * fundamento, medir, afinar y llevarlo a producción. Cada bloque acaba en un
 * jefe contrarreloj y dice qué pieza de tu propio RAG ya puedes escribir
 * (`build`): un esqueleto corto en Python, con comentarios en vez de solución,
 * y cómo comprobar que funciona. Juntas, las nueve piezas son la guía de
 * construcción (`docs/curso-rag.md`).
 */

import type { Block } from './types.js'

export const BLOCKS: Block[] = [
  {
    n: 1,
    tier: 'beginner',
    es: {
      title: 'RAG y el corpus',
      pitch: 'Por qué buscar antes de responder, qué se carga y cómo se trocea.',
      build: {
        piece:
          'El cargador y el troceador: de una carpeta a una lista de trozos con su ruta y sus líneas.',
        skeleton: [
          'def load_documents(root, extensions=(".md", ".py")):',
          '    # recorre root; salta .env, *.lock y lo que no sea texto',
          '    # devuelve [(ruta, texto)]',
          '',
          'def chunk(path, text, max_size):',
          '    # .md: corta en cada encabezado; .py: en cada def/class (ast)',
          '    # si un apartado pasa de max_size, pártelo con algo de solape',
          '    # cada trozo guarda ruta, línea inicial y final, y su texto',
        ],
        verify:
          'Imprime cuántos trozos salen y el más largo. Busca a mano tres frases que sabes que responden algo: cada una tiene que estar entera en algún trozo.',
      },
    },
    en: {
      title: 'RAG and the corpus',
      pitch: 'Why you search before answering, what you load and how you chunk it.',
      build: {
        piece:
          'The loader and the chunker: from a folder to a list of chunks with their path and lines.',
        skeleton: [
          'def load_documents(root, extensions=(".md", ".py")):',
          '    # walk root; skip .env, *.lock and anything that is not text',
          '    # return [(path, text)]',
          '',
          'def chunk(path, text, max_size):',
          '    # .md: cut at every heading; .py: at every def/class (ast)',
          '    # if a section is over max_size, split it with some overlap',
          '    # each chunk keeps path, first and last line, and its text',
        ],
        verify:
          'Print how many chunks you get and the longest one. Look up by hand three sentences you know answer something: each must sit whole inside some chunk.',
      },
    },
    jobs: ['backend', 'ml', 'data'],
  },
  {
    n: 2,
    tier: 'beginner',
    es: {
      title: 'Búsqueda léxica',
      pitch: 'Tokens, TF, IDF y BM25: encontrar por las palabras que se comparten.',
      build: {
        piece: 'El tokenizador y el índice BM25 sobre tus trozos.',
        skeleton: [
          'def tokenize(text):',
          '    # minúsculas, sin acentos; parte snake_case y camelCase',
          '    # quita palabras vacías; recorta plurales',
          '',
          'class BM25Index:',
          '    def __init__(self, chunks, k1=1.2, b=0.75):',
          '        # tf por trozo, df por término, largo medio',
          '    def search(self, query, k):',
          '        # suma idf * tf*(k1+1) / (tf + k1*(1 - b + b*largo/medio))',
          '        # devuelve los k mejores (trozo, puntuación)',
        ],
        verify:
          'Busca el nombre exacto de una función de tu repositorio: su trozo tiene que salir el primero. Cambia k1 y b y mira que el orden cambia.',
      },
    },
    en: {
      title: 'Lexical search',
      pitch: 'Tokens, TF, IDF and BM25: finding by the words you share.',
      build: {
        piece: 'The tokenizer and the BM25 index over your chunks.',
        skeleton: [
          'def tokenize(text):',
          '    # lower case, no accents; split snake_case and camelCase',
          '    # drop stop words; trim plurals',
          '',
          'class BM25Index:',
          '    def __init__(self, chunks, k1=1.2, b=0.75):',
          '        # tf per chunk, df per term, average length',
          '    def search(self, query, k):',
          '        # sum idf * tf*(k1+1) / (tf + k1*(1 - b + b*length/average))',
          '        # return the k best (chunk, score)',
        ],
        verify:
          'Search for the exact name of a function in your repository: its chunk must come first. Change k1 and b and check that the order changes.',
      },
    },
    jobs: ['backend', 'search', 'data'],
  },
  {
    n: 3,
    tier: 'beginner',
    es: {
      title: 'Búsqueda semántica',
      pitch: 'Embeddings y coseno: encontrar aunque la pregunta use otras palabras.',
      build: {
        piece: 'El índice semántico: un vector por trozo y la búsqueda por coseno.',
        skeleton: [
          'model = SentenceTransformer("all-MiniLM-L6-v2")  # pequeño, en CPU',
          '',
          'def build_semantic(chunks):',
          '    # vectors = model.encode(textos, normalize_embeddings=True)',
          '    # guarda la matriz en disco: calcularla es lo caro',
          '',
          'def semantic_search(query, k):',
          '    # q = model.encode([query], normalize_embeddings=True)',
          '    # con vectores normalizados, coseno = producto escalar',
          '    # devuelve los k trozos con mayor coseno',
        ],
        verify:
          'Pregunta lo mismo con otras palabras (o en otro idioma) y compara con BM25: la semántica tiene que encontrar el trozo que la léxica no ve.',
      },
    },
    en: {
      title: 'Semantic search',
      pitch: 'Embeddings and cosine: finding even when the question uses other words.',
      build: {
        piece: 'The semantic index: one vector per chunk and cosine search.',
        skeleton: [
          'model = SentenceTransformer("all-MiniLM-L6-v2")  # small, on CPU',
          '',
          'def build_semantic(chunks):',
          '    # vectors = model.encode(texts, normalize_embeddings=True)',
          '    # save the matrix to disk: computing it is the expensive part',
          '',
          'def semantic_search(query, k):',
          '    # q = model.encode([query], normalize_embeddings=True)',
          '    # with normalized vectors, cosine = dot product',
          '    # return the k chunks with the highest cosine',
        ],
        verify:
          'Ask the same thing in other words (or another language) and compare with BM25: semantic search must find the chunk lexical search cannot see.',
      },
    },
    jobs: ['ml', 'search', 'data'],
  },
  {
    n: 4,
    tier: 'intermediate',
    es: {
      title: 'Híbrido y reordenado',
      pitch: 'RRF junta las dos listas y un reordenado afina los primeros puestos.',
      build: {
        piece: 'El recuperador híbrido: fusión por rangos y, si compensa, reordenado.',
        skeleton: [
          'def rrf(lexical, semantic, weight=0.5, k=60):',
          '    # puntos[trozo] += (1 - weight) / (k + puesto_lexico)',
          '    # puntos[trozo] += weight / (k + puesto_semantico)',
          '    # ordena por puntos, de más a menos',
          '',
          'def retrieve(query, k, rerank_depth=0):',
          '    # pide ~20 a cada buscador y fusiona',
          '    # opcional: reordena los rerank_depth primeros (cross-encoder)',
          '    # devuelve los k primeros',
        ],
        verify:
          'Con una pregunta de identificador exacto y otra con otras palabras, el híbrido tiene que acertar las dos. Mide cuánto tarda con y sin reordenado.',
      },
    },
    en: {
      title: 'Hybrid and reranking',
      pitch: 'RRF merges both lists and a reranker sharpens the top places.',
      build: {
        piece: 'The hybrid retriever: rank fusion and, if it pays off, reranking.',
        skeleton: [
          'def rrf(lexical, semantic, weight=0.5, k=60):',
          '    # score[chunk] += (1 - weight) / (k + lexical_rank)',
          '    # score[chunk] += weight / (k + semantic_rank)',
          '    # sort by score, highest first',
          '',
          'def retrieve(query, k, rerank_depth=0):',
          '    # ask each searcher for ~20 and fuse them',
          '    # optional: rerank the first rerank_depth (cross-encoder)',
          '    # return the first k',
        ],
        verify:
          'With an exact-identifier question and one in other words, hybrid must get both. Measure how long it takes with and without reranking.',
      },
    },
    jobs: ['ml', 'search', 'backend'],
  },
  {
    n: 5,
    tier: 'intermediate',
    es: {
      title: 'El prompt',
      pitch: 'Presupuesto de tokens, orden de los trozos y fuentes numeradas.',
      build: {
        piece:
          'El montador del prompt: instrucciones, fuentes numeradas y pregunta, sin pasar del presupuesto.',
        skeleton: [
          'def build_prompt(question, chunks, budget):',
          '    # used = tokens(INSTRUCCIONES) + tokens(question)',
          '    # recorre chunks del mejor al peor:',
          '    #   si used + tokens(trozo) > budget: para',
          '    #   añade "[n] ruta:lineas" y el texto; suma a used',
          '    # termina con la pregunta',
          '    # devuelve el prompt y las fuentes que entraron',
        ],
        verify:
          'Con un presupuesto pequeño, el trozo mejor puntuado tiene que seguir dentro. Cuenta los tokens con el tokenizador de tu modelo, no a ojo.',
      },
    },
    en: {
      title: 'The prompt',
      pitch: 'Token budget, chunk order and numbered sources.',
      build: {
        piece:
          'The prompt builder: instructions, numbered sources and the question, within the budget.',
        skeleton: [
          'def build_prompt(question, chunks, budget):',
          '    # used = tokens(INSTRUCTIONS) + tokens(question)',
          '    # walk chunks from best to worst:',
          '    #   if used + tokens(chunk) > budget: stop',
          '    #   add "[n] path:lines" and the text; add to used',
          '    # end with the question',
          '    # return the prompt and the sources that made it in',
        ],
        verify:
          'With a small budget, the best-scored chunk must still be inside. Count tokens with your model tokenizer, not by eye.',
      },
    },
    jobs: ['ml', 'backend', 'product'],
  },
  {
    n: 6,
    tier: 'intermediate',
    es: {
      title: 'Generación con fundamento',
      pitch: 'Responder solo con el contexto, citar la fuente y saber decir «no lo sé».',
      build: {
        piece: 'El generador: el modelo local responde con citas o reconoce que no lo sabe.',
        skeleton: [
          'INSTRUCCIONES = (',
          '    "Responde solo con las fuentes. Cita así: [n]. "',
          '    "Si no está en las fuentes, di: No lo sé."',
          ')',
          '',
          'def answer(question, k):',
          '    # chunks = retrieve(question, k)',
          '    # si el mejor trozo puntúa por debajo de un mínimo: "No lo sé"',
          '    # texto = llm(build_prompt(question, chunks, budget))',
          '    # devuelve texto y las fuentes citadas (ruta y líneas)',
        ],
        verify:
          'Haz una pregunta que tu corpus no responde: tiene que decir «No lo sé». En las que sí responde, abre la fuente citada y comprueba que la frase está ahí.',
      },
    },
    en: {
      title: 'Grounded generation',
      pitch: 'Answer only from the context, cite the source and know how to say "I do not know".',
      build: {
        piece: 'The generator: the local model answers with citations or admits it does not know.',
        skeleton: [
          'INSTRUCTIONS = (',
          '    "Answer only from the sources. Cite like this: [n]. "',
          '    "If it is not in the sources, say: I do not know."',
          ')',
          '',
          'def answer(question, k):',
          '    # chunks = retrieve(question, k)',
          '    # if the best chunk scores under a minimum: "I do not know"',
          '    # text = llm(build_prompt(question, chunks, budget))',
          '    # return the text and the cited sources (path and lines)',
        ],
        verify:
          'Ask something your corpus does not answer: it must say "I do not know". For the ones it does answer, open the cited source and check the sentence is there.',
      },
    },
    jobs: ['ml', 'backend', 'product'],
  },
  {
    n: 7,
    tier: 'advanced',
    es: {
      title: 'Evaluar',
      pitch: 'recall@k, precisión y MRR sobre un conjunto de referencia: medir, no mirar.',
      build: {
        piece: 'El evaluador: recall@k y MRR de tu recuperador contra un conjunto de referencia.',
        skeleton: [
          'def is_hit(found, gold):',
          '    # mismo fichero y las líneas se solapan lo bastante',
          '',
          'def evaluate(dataset, k):',
          '    # por cada pregunta: found = retrieve(pregunta, k)',
          '    # recall@k: ¿hay algún acierto entre los k?',
          '    # mrr: 1 / puesto del primer acierto (0 si no hay)',
          '    # devuelve las medias y la lista de preguntas falladas',
        ],
        verify:
          'Un recuperador que devuelve siempre lo mismo tiene que dar un recall bajísimo; uno que devuelve la respuesta de referencia, 1. Si no, el evaluador está mal.',
      },
    },
    en: {
      title: 'Evaluate',
      pitch: 'recall@k, precision and MRR on a reference set: measure, do not eyeball.',
      build: {
        piece: 'The evaluator: recall@k and MRR of your retriever against a reference set.',
        skeleton: [
          'def is_hit(found, gold):',
          '    # same file and the lines overlap enough',
          '',
          'def evaluate(dataset, k):',
          '    # for each question: found = retrieve(question, k)',
          '    # recall@k: is there any hit among the k?',
          '    # mrr: 1 / rank of the first hit (0 if none)',
          '    # return the means and the list of failed questions',
        ],
        verify:
          'A retriever that always returns the same thing must score a very low recall; one that returns the reference answer, 1. If not, the evaluator is wrong.',
      },
    },
    jobs: ['ml', 'data', 'qa'],
  },
  {
    n: 8,
    tier: 'advanced',
    es: {
      title: 'Afinar sin sobreajustar',
      pitch: 'Fugas del conjunto de evaluación, validación cruzada y coste frente a beneficio.',
      build: {
        piece:
          'El laboratorio: probar configuraciones con validación cruzada y apuntar lo que cuesta cada una.',
        skeleton: [
          'def cross_validate(config, dataset, folds=5):',
          '    # parte dataset en folds trozos; evalúa config en cada uno',
          '    # devuelve la media y cuánto varía entre trozos',
          '',
          'def tune(grid, dataset):',
          '    # aparta un 20 % de test y no lo mires hasta el final',
          '    # por cada config: media de cross_validate y segundos que tarda',
          '    # elige la mejor por la media; ante empate, la más barata',
          '    # una sola vez: evalúa la elegida en test',
        ],
        verify:
          'La diferencia entre dev y test de la configuración elegida tiene que ser pequeña. Si en dev da 1,00, busca la fuga antes de celebrarlo.',
      },
    },
    en: {
      title: 'Tune without overfitting',
      pitch: 'Evaluation-set leaks, cross-validation and cost against benefit.',
      build: {
        piece: 'The lab: try configurations with cross-validation and note what each one costs.',
        skeleton: [
          'def cross_validate(config, dataset, folds=5):',
          '    # split dataset into folds parts; evaluate config on each',
          '    # return the mean and how much it varies across parts',
          '',
          'def tune(grid, dataset):',
          '    # set 20% aside as test and do not look at it until the end',
          '    # for each config: mean of cross_validate and seconds it takes',
          '    # pick the best by mean; on a tie, the cheapest',
          '    # once only: evaluate the chosen one on test',
        ],
        verify:
          'The gap between dev and test for the chosen configuration must be small. If dev says 1.00, look for the leak before you celebrate.',
      },
    },
    jobs: ['ml', 'data', 'research'],
  },
  {
    n: 9,
    tier: 'advanced',
    es: {
      title: 'Producción',
      pitch: 'Indexado incremental, caché, la API y un diagnóstico de fallos por etapas.',
      build: {
        piece: 'Lo que lo vuelve un servicio: indexado incremental, caché y una API HTTP.',
        skeleton: [
          'def index(root):',
          '    # hash de cada fichero; compara con el manifiesto guardado',
          '    # solo trocea y calcula embeddings de lo nuevo o cambiado',
          '    # borra los trozos de ficheros que ya no existen; vacía la caché',
          '',
          'def cached_answer(question, k):',
          '    # clave = (pregunta normalizada, k, versión del índice)',
          '',
          '# POST /answer {"query", "k"} -> {"answer", "sources"}',
          '# valida antes de buscar: query vacía o k fuera de rango = 422',
        ],
        verify:
          'Cambia un fichero y reindexa: solo se recalculan sus trozos y la respuesta nueva sale a la primera. Repite una pregunta: la segunda vez tarda milisegundos.',
      },
    },
    en: {
      title: 'Production',
      pitch: 'Incremental indexing, caching, the API and a stage-by-stage failure diagnosis.',
      build: {
        piece: 'What turns it into a service: incremental indexing, a cache and an HTTP API.',
        skeleton: [
          'def index(root):',
          '    # hash every file; compare with the saved manifest',
          '    # only chunk and embed what is new or changed',
          '    # drop the chunks of files that are gone; empty the cache',
          '',
          'def cached_answer(question, k):',
          '    # key = (normalized question, k, index version)',
          '',
          '# POST /answer {"query", "k"} -> {"answer", "sources"}',
          '# validate before searching: empty query or k out of range = 422',
        ],
        verify:
          'Change one file and reindex: only its chunks are recomputed and the new answer shows up first time. Repeat a question: the second time takes milliseconds.',
      },
    },
    jobs: ['backend', 'devops', 'ml'],
  },
]

export function blockOf(n: number): Block | undefined {
  return BLOCKS.find((block) => block.n === n)
}
