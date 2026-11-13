/**
 * Nivel principiante: recuperar. Bloques 1 a 3 y su jefe final. Primero por
 * qué se busca antes de responder y qué se carga y cómo se trocea; luego la
 * búsqueda por palabras (tokens, TF, IDF, BM25, k) y la búsqueda por
 * significado (embeddings y coseno).
 */

import { DEV_FOUND, HAND_DOCS, NOISY, PARAPHRASES, TYPED } from './sets.js'
import type { Setup, UnitDef } from './types.js'

/** Todo lo que hay en el repositorio, cargado sin mirar. */
const EVERYTHING: Setup = { sources: ['docs', 'code', 'lock', 'env', 'eval'] }

/** Un buscador solo léxico: lo que hay hasta que llega el bloque 3. */
const LEXICAL: Setup = { mode: 'lexical' }

const RAW: Setup = { ...LEXICAL, normalize: false, stopwords: false, stem: false }

const WAIT_SENTENCE =
  'La espera crece de forma exponencial: empieza en 2 segundos y se duplica en cada reintento, hasta un máximo de 300 segundos.'

export const BEGINNER: UnitDef[] = [
  /* ---------- Bloque 1: RAG y el corpus ---------- */
  {
    id: 'rag-why',
    block: 1,
    tier: 'beginner',
    kind: 'unit',
    es: {
      title: 'Buscar antes de responder',
      goal: 'Haz que el bot responda a las tres preguntas leyendo la documentación, sin inventarse ninguna.',
      theory: {
        what: 'RAG busca en tus documentos los trozos que tocan y se los da al modelo junto a la pregunta. El modelo responde leyendo, no de memoria.',
        how: [
          'trozos = buscar(pregunta, k=3)    # en tu corpus',
          'prompt = montar(trozos, pregunta) # contexto + pregunta',
          'respuesta = modelo(prompt)        # y cita la fuente',
        ],
        when: 'Cuando el modelo no puede saberlo: documentación interna, código de tu equipo o datos que cambian cada semana.',
        whenNot:
          'Si la respuesta es de cultura general o cabe entera en el prompt, buscar solo añade latencia y sitios donde fallar.',
        problems:
          'Creer que el modelo «ya lo sabe». Sin contexto contesta con aplomo un dato viejo, y el banco lo marca como «Inventada». Enciende el contexto.',
      },
      example:
        'Antes de verlo: Colmena reintenta 5 veces, pero el modelo aprendió con la versión 1. Sin contexto, ¿qué dirá?',
      frames: [
        'Sin contexto contesta de memoria: un dato de la versión 1, dicho con toda seguridad.',
        'Con contexto lee el trozo que toca y responde con su cita.',
      ],
    },
    en: {
      title: 'Search before you answer',
      goal: 'Make the bot answer the three questions by reading the documentation, without making any of them up.',
      theory: {
        what: 'RAG searches your documents for the chunks that matter and hands them to the model with the question. The model answers by reading, not from memory.',
        how: [
          'chunks = search(question, k=3)    # in your corpus',
          'prompt = build(chunks, question)  # context + question',
          'answer = model(prompt)            # and it cites the source',
        ],
        when: 'When the model cannot know it: internal documentation, your team code or data that changes every week.',
        whenNot:
          'If the answer is general knowledge or fits whole in the prompt, searching only adds latency and places to fail.',
        problems:
          'Thinking the model "already knows". With no context it confidently gives a stale fact, and the bench marks it as "Made up". Turn the context on.',
      },
      example:
        'Before you look: Colmena retries 5 times, but the model learned from version 1. With no context, what will it say?',
      frames: [
        'With no context it answers from memory: a version 1 fact, stated with full confidence.',
        'With context it reads the right chunk and answers with its citation.',
      ],
    },
    tasks: [
      {
        kind: 'tune',
        base: { context: false },
        knobs: ['context'],
        questions: ['retries', 'heartbeat', 'full'],
        objectives: [
          { metric: 'answers', op: '>=' },
          { metric: 'invented', op: '<=' },
        ],
        solution: [{}, { context: true }],
      },
    ],
    example: [
      { show: 'trace', question: 'retries', config: { context: false }, focus: 'answer' },
      { show: 'trace', question: 'retries', focus: 'answer' },
    ],
  },
  {
    id: 'rag-corpus',
    block: 1,
    tier: 'beginner',
    kind: 'unit',
    es: {
      title: 'Qué se carga',
      goal: 'Alguien indexó el repositorio entero. Deja solo lo que responde preguntas: ni secretos ni ruido.',
      theory: {
        what: 'El corpus es lo que tu RAG puede encontrar. Cargar es elegir qué ficheros entran: lo que indexas puede acabar en una respuesta.',
        how: [
          'docs/*.md, README.md  # guías: sí',
          'src/**/*.py           # código: sí',
          'poetry.lock           # ruido: no',
          '.env                  # secretos: nunca',
        ],
        when: 'Al empezar y cada vez que el repositorio gana una carpeta nueva: decide por extensión y por ruta.',
        whenNot: 'No filtres de más: sin src/ el bot no puede decir dónde está una función.',
        problems:
          'Indexar todo «por si acaso». Se nota en que «Secretos en el índice» no es 0 y en que el .env sale como fuente de una respuesta. Quita esas fuentes.',
      },
      example:
        'Antes de verlo: con el .env indexado, preguntas de qué variable se lee la dirección de Redis. ¿Qué fuente crees que llega al prompt?',
      frames: [
        'Con todo cargado: 1 trozo con secretos, ruido del .lock y peor puntería.',
        'El .env llega al prompt: la contraseña de producción está a una pregunta de salir.',
        'Solo guías y código: menos trozos, ningún secreto y más aciertos.',
      ],
    },
    en: {
      title: 'What gets loaded',
      goal: 'Someone indexed the whole repository. Keep only what answers questions: no secrets, no noise.',
      theory: {
        what: 'The corpus is what your RAG can find. Loading means choosing which files go in: whatever you index can end up in an answer.',
        how: [
          'docs/*.md, README.md  # guides: yes',
          'src/**/*.py           # code: yes',
          'poetry.lock           # noise: no',
          '.env                  # secrets: never',
        ],
        when: 'At the start and whenever the repository gains a new folder: decide by extension and by path.',
        whenNot: 'Do not over-filter: without src/ the bot cannot say where a function lives.',
        problems:
          'Indexing everything "just in case". You notice because "Secrets in the index" is not 0 and the .env shows up as the source of an answer. Remove those sources.',
      },
      example:
        'Before you look: with the .env indexed, you ask which variable holds the Redis address. Which source do you think reaches the prompt?',
      frames: [
        'With everything loaded: 1 chunk with secrets, noise from the .lock and worse aim.',
        'The .env reaches the prompt: the production password is one question away from leaking.',
        'Guides and code only: fewer chunks, no secrets and more hits.',
      ],
    },
    tasks: [
      {
        kind: 'tune',
        base: { ...LEXICAL, ...EVERYTHING },
        knobs: ['sources'],
        questions: DEV_FOUND,
        objectives: [
          { metric: 'recall@3', op: '>=' },
          { metric: 'secrets', op: '<=' },
          { metric: 'noise', op: '<=' },
        ],
        solution: [{}, { sources: ['docs', 'code'] }],
      },
    ],
    example: [
      {
        show: 'metrics',
        config: { ...LEXICAL, ...EVERYTHING },
        questions: DEV_FOUND,
        keys: ['chunks', 'secrets', 'noise', 'recall@3'],
      },
      { show: 'trace', question: 'redis', config: { ...LEXICAL, ...EVERYTHING }, focus: 'prompt' },
      {
        show: 'metrics',
        config: LEXICAL,
        questions: DEV_FOUND,
        keys: ['chunks', 'secrets', 'noise', 'recall@3'],
      },
    ],
  },
  {
    id: 'rag-chunk-size',
    block: 1,
    tier: 'beginner',
    kind: 'unit',
    es: {
      title: 'Trocear: el tamaño',
      goal: 'Los trozos de 10 palabras parten las respuestas. Encuentra un tamaño que las deje enteras sin llenar el prompt.',
      theory: {
        what: 'Trocear es partir cada documento en trozos que se indexan y se recuperan por separado. El troceado fijo corta cada N palabras, caiga donde caiga.',
        how: [
          'trocear(doc, tamaño=10)   # frases partidas',
          'trocear(doc, tamaño=50)   # frases enteras',
          'trocear(doc, tamaño=200)  # medio documento',
        ],
        when: 'Siempre: un documento entero no cabe en el prompt y un vector suyo no dice de qué habla cada párrafo.',
        whenNot:
          'Más grande no es mejor: tres trozos enormes gastan el prompt en paja y la respuesta queda enterrada.',
        problems:
          'Trozos demasiado pequeños: la frase con la respuesta queda en dos mitades y ninguna acierta. El banco lo dice: «Se pierde al trocear». Sube el tamaño.',
      },
      example:
        'Antes de verlo: la respuesta ocupa 8 palabras y los trozos son de 10. ¿Quedará entera en alguno?',
      frames: [
        'Con trozos de 10 palabras, la frase de la respuesta cae a caballo entre dos.',
        'Con trozos de 50, la frase queda entera dentro de uno y se puede recuperar.',
      ],
    },
    en: {
      title: 'Chunking: the size',
      goal: 'Chunks of 10 words split the answers. Find a size that keeps them whole without filling the prompt.',
      theory: {
        what: 'Chunking splits each document into chunks that are indexed and retrieved on their own. Fixed chunking cuts every N words, wherever that falls.',
        how: [
          'chunk(doc, size=10)   # broken sentences',
          'chunk(doc, size=50)   # whole sentences',
          'chunk(doc, size=200)  # half a document',
        ],
        when: 'Always: a whole document does not fit the prompt, and one vector for it cannot say what each paragraph is about.',
        whenNot:
          'Bigger is not better: three huge chunks spend the prompt on padding and bury the answer.',
        problems:
          'Chunks too small: the sentence with the answer ends up in two halves and neither one hits. The bench says so: "Lost while chunking". Raise the size.',
      },
      example:
        'Before you look: the answer takes 8 words and chunks are 10 words long. Will it stay whole in any of them?',
      frames: [
        'With 10-word chunks, the answer sentence straddles two of them.',
        'With 50-word chunks, the sentence sits whole inside one and can be retrieved.',
      ],
    },
    tasks: [
      {
        kind: 'tune',
        base: { ...LEXICAL, chunker: 'fixed', size: 10 },
        knobs: ['size'],
        questions: DEV_FOUND,
        objectives: [
          { metric: 'whole', op: '>=' },
          { metric: 'tokens', op: '<=' },
        ],
        solution: [{}, { size: 50 }],
      },
    ],
    example: [
      {
        show: 'trace',
        question: 'full',
        config: { ...LEXICAL, chunker: 'fixed', size: 10 },
        focus: 'chunks',
      },
      {
        show: 'trace',
        question: 'full',
        config: { ...LEXICAL, chunker: 'fixed', size: 50 },
        focus: 'chunks',
      },
    ],
  },
  {
    id: 'rag-chunk-overlap',
    block: 1,
    tier: 'beginner',
    kind: 'unit',
    es: {
      title: 'Trocear: el solape',
      goal: 'Sin cambiar el tamaño (30 palabras), usa el solape para que las frases partidas queden enteras, con los menos trozos posibles.',
      theory: {
        what: 'El solape repite el final de cada trozo al principio del siguiente. Lo que un corte parte por la mitad queda entero en uno de los dos.',
        how: [
          'trocear(doc, 30, solape=0)   # 0-30, 30-60…',
          'trocear(doc, 30, solape=10)  # 0-30, 20-50…',
        ],
        when: 'Con troceado fijo, cuando ves respuestas cortadas justo en la frontera entre dos trozos.',
        whenNot:
          'El solape no es gratis: con 10 de 30, un tercio del índice está repetido. Más trozos son más memoria y más cálculo.',
        problems:
          'Pasarse de solape: los primeros puestos se llenan de trozos casi iguales y desplazan a otros. Se nota en que «Trozos en el índice» se dispara. Usa el mínimo que arregle los cortes.',
      },
      example:
        'Antes de verlo: con trozos de 30 y solape 10, ¿cada cuántas palabras empieza un trozo nuevo?',
      frames: [
        'Sin solape, el corte cae en medio de la frase y ningún trozo la tiene entera.',
        'Con solape 10, el trozo siguiente empieza 10 palabras antes y la recoge entera.',
      ],
    },
    en: {
      title: 'Chunking: the overlap',
      goal: 'Without changing the size (30 words), use overlap so that split sentences stay whole, with as few chunks as you can.',
      theory: {
        what: 'Overlap repeats the end of each chunk at the start of the next one. Whatever a cut splits in half stays whole in one of the two.',
        how: [
          'chunk(doc, 30, overlap=0)   # 0-30, 30-60…',
          'chunk(doc, 30, overlap=10)  # 0-30, 20-50…',
        ],
        when: 'With fixed chunking, when you see answers cut right at the border between two chunks.',
        whenNot:
          'Overlap is not free: with 10 out of 30, a third of the index is repeated. More chunks mean more memory and more compute.',
        problems:
          'Too much overlap: the top places fill with near-identical chunks that push others out. You notice because "Chunks in the index" shoots up. Use the minimum that fixes the cuts.',
      },
      example:
        'Before you look: with 30-word chunks and overlap 10, how many words apart do new chunks start?',
      frames: [
        'With no overlap, the cut falls mid-sentence and no chunk holds it whole.',
        'With overlap 10, the next chunk starts 10 words earlier and picks it up whole.',
      ],
    },
    tasks: [
      {
        kind: 'tune',
        base: { ...LEXICAL, chunker: 'fixed', size: 30 },
        knobs: ['overlap'],
        questions: DEV_FOUND,
        objectives: [
          { metric: 'whole', op: '>=' },
          { metric: 'chunks', op: '<=' },
        ],
        solution: [{}, { overlap: 10 }],
      },
    ],
    example: [
      {
        show: 'trace',
        question: 'full',
        config: { ...LEXICAL, chunker: 'fixed', size: 30 },
        focus: 'chunks',
      },
      {
        show: 'trace',
        question: 'full',
        config: { ...LEXICAL, chunker: 'fixed', size: 30, overlap: 10 },
        focus: 'chunks',
      },
    ],
  },
  {
    id: 'rag-chunk-structure',
    block: 1,
    tier: 'beginner',
    kind: 'unit',
    es: {
      title: 'Trocear por estructura',
      goal: 'Consigue que todas las respuestas queden enteras, con mejor puntería que el troceado fijo y un prompt más corto.',
      theory: {
        what: 'El troceado por estructura corta donde ya cortó quien escribió: un trozo por apartado en Markdown y uno por función o clase en Python.',
        how: [
          'docs/colas.md   # un trozo por cada «## …»',
          'src/retry.py    # uno por cada def o class',
          'apartado largo  # se parte con tamaño y solape',
        ],
        when: 'Siempre que el documento tenga forma: guías con encabezados, código, FAQ. Cada trozo habla de una sola cosa.',
        whenNot:
          'Un registro o un texto sin encabezados no tiene estructura que seguir: ahí, troceado fijo con solape.',
        problems:
          'Olvidar el tope: una clase de 300 líneas en un solo trozo no cabe en el prompt. El banco enseña «Tokens del prompt» por encima del objetivo. Pon un tamaño máximo.',
      },
      example:
        'Antes de verlo: deploy.md tiene cuatro apartados cortos. Con ventanas fijas de 30 palabras, ¿caerán los cortes en los títulos?',
      frames: [
        'Troceado fijo: la ventana corta por donde cae y parte la frase del puerto.',
        'Por estructura: cada apartado es un trozo, con su título y su respuesta enteros.',
      ],
    },
    en: {
      title: 'Chunking by structure',
      goal: 'Get every answer to stay whole, with better aim than fixed chunking and a shorter prompt.',
      theory: {
        what: 'Structural chunking cuts where the author already did: one chunk per section in Markdown and one per function or class in Python.',
        how: [
          'docs/colas.md  # one chunk per "## …"',
          'src/retry.py   # one per def or class',
          'long section   # split with size and overlap',
        ],
        when: 'Whenever the document has shape: guides with headings, code, FAQs. Each chunk is about one thing.',
        whenNot:
          'A log or a text with no headings has no structure to follow: use fixed chunking with overlap there.',
        problems:
          'Forgetting the cap: a 300-line class in one chunk does not fit the prompt. The bench shows "Prompt tokens" above the goal. Set a maximum size.',
      },
      example:
        'Before you look: deploy.md has four short sections. With fixed 30-word windows, will the cuts fall on the headings?',
      frames: [
        'Fixed chunking: the window cuts wherever it lands and splits the sentence about the port.',
        'By structure: each section is one chunk, with its heading and its answer whole.',
      ],
    },
    tasks: [
      {
        kind: 'tune',
        base: { ...LEXICAL, chunker: 'fixed', size: 30, overlap: 10 },
        knobs: ['chunker', 'size', 'overlap'],
        questions: DEV_FOUND,
        objectives: [
          { metric: 'whole', op: '>=' },
          { metric: 'recall@3', op: '>=' },
          { metric: 'tokens', op: '<=' },
        ],
        solution: [{}, { chunker: 'structure', size: 60, overlap: 0 }],
      },
    ],
    example: [
      {
        show: 'trace',
        question: 'health',
        config: { ...LEXICAL, chunker: 'fixed', size: 30 },
        focus: 'chunks',
      },
      { show: 'trace', question: 'health', config: LEXICAL, focus: 'chunks' },
    ],
  },
  {
    id: 'rag-boss-invents',
    block: 1,
    tier: 'beginner',
    kind: 'boss',
    limit: 240,
    es: {
      title: 'El bot de soporte se inventa las respuestas',
      goal: 'Deja el bot de soporte de Colmena respondiendo con la documentación delante, con un corpus limpio y trozos que no parten las respuestas.',
      story:
        'Lunes, 9:10. Soporte reenvía una captura: el bot le ha dicho a una clienta que Colmena reintenta 3 veces. Son 5 desde la versión 2. Alguien lo desplegó el viernes sin contexto, y de paso probó a indexar el repositorio entero «para que supiera más».',
      tasks: [
        'Enciende el contexto y deja en el corpus solo guías y código: ni secretos ni ruido.',
        'Arregla el troceado: todas las respuestas enteras, buena puntería y prompt corto.',
      ],
    },
    en: {
      title: 'The support bot makes its answers up',
      goal: 'Leave the Colmena support bot answering with the documentation in front of it, with a clean corpus and chunks that do not split the answers.',
      story:
        'Monday, 9:10. Support forwards a screenshot: the bot told a customer that Colmena retries 3 times. It has been 5 since version 2. Someone deployed it on Friday with no context, and also tried indexing the whole repository "so it would know more".',
      tasks: [
        'Turn the context on and keep only guides and code in the corpus: no secrets, no noise.',
        'Fix the chunking: every answer whole, good aim and a short prompt.',
      ],
    },
    tasks: [
      {
        kind: 'tune',
        base: { ...LEXICAL, ...EVERYTHING, context: false },
        knobs: ['context', 'sources'],
        questions: DEV_FOUND,
        objectives: [
          { metric: 'invented', op: '<=' },
          { metric: 'recall@3', op: '>=' },
          { metric: 'secrets', op: '<=' },
          { metric: 'noise', op: '<=' },
        ],
        solution: [{ context: true, sources: ['docs', 'code'] }],
      },
      {
        kind: 'tune',
        base: { ...LEXICAL, chunker: 'fixed', size: 15 },
        knobs: ['chunker', 'size', 'overlap'],
        questions: DEV_FOUND,
        objectives: [
          { metric: 'whole', op: '>=' },
          { metric: 'recall@3', op: '>=' },
          { metric: 'tokens', op: '<=' },
        ],
        solution: [{ chunker: 'structure', size: 60, overlap: 0 }],
      },
    ],
  },

  /* ---------- Bloque 2: búsqueda léxica ---------- */
  {
    id: 'rag-tokens',
    block: 2,
    tier: 'beginner',
    kind: 'unit',
    es: {
      title: 'Tokens y normalización',
      goal: 'La gente escribe con prisa: sin acentos, en mayúsculas, en plural. Haz que esas cinco consultas encuentren su respuesta a la primera.',
      theory: {
        what: 'Tokenizar es convertir el texto en las palabras que se comparan. Normalizar quita las diferencias que no importan: mayúsculas, acentos, plurales y palabras vacías.',
        how: [
          '"Límite de Tamaño" -> limite, tamano  # normaliza',
          '"MAX_RETRIES"      -> max, retries    # parte',
          '"de", "la", "the"  -> fuera           # vacías',
          '"colas", "cola"    -> cola            # recorta',
        ],
        when: 'Siempre, y con el mismo tokenizador al indexar y al buscar: si no, las palabras no casan.',
        whenNot:
          'Recortar de más junta palabras distintas. Y en código, las mayúsculas y los guiones bajos también son pistas: conserva el identificador entero además de sus partes.',
        problems:
          'Comparar tal cual. «LIMITE DE TAMANO» no encuentra «Límite de tamaño» y la lista léxica sale vacía. Enciende la normalización.',
      },
      example:
        'Antes de verlo: el documento dice «Límite de tamaño» y alguien busca «LIMITE DE TAMANO». Sin normalizar, ¿cuántas palabras comparten?',
      frames: [
        'Sin normalizar no comparten ninguna palabra: la búsqueda no devuelve su trozo.',
        'Normalizando y recortando, las tres palabras casan y su trozo sale el primero.',
      ],
    },
    en: {
      title: 'Tokens and normalization',
      goal: 'People type in a hurry: no accents, all caps, plurals. Make those five queries find their answer in first place.',
      theory: {
        what: 'Tokenizing turns text into the words that get compared. Normalizing removes the differences that do not matter: case, accents, plurals and stop words.',
        how: [
          '"Límite de Tamaño" -> limite, tamano  # normalize',
          '"MAX_RETRIES"      -> max, retries    # split',
          '"de", "la", "the"  -> dropped         # stop words',
          '"colas", "cola"    -> cola            # stem',
        ],
        when: 'Always, and with the same tokenizer when indexing and when searching: otherwise words do not match.',
        whenNot:
          'Stemming too hard merges different words. And in code, case and underscores are clues too: keep the whole identifier as well as its parts.',
        problems:
          'Comparing as is. "LIMITE DE TAMANO" does not find "Límite de tamaño" and the lexical list comes back empty. Turn normalization on.',
      },
      example:
        'Before you look: the document says "Límite de tamaño" and someone searches "LIMITE DE TAMANO". Without normalizing, how many words do they share?',
      frames: [
        'Without normalizing they share no word: the search does not return its chunk.',
        'With normalizing and stemming, all three words match and its chunk comes first.',
      ],
    },
    tasks: [
      {
        kind: 'tune',
        base: { ...RAW, k: 1 },
        knobs: ['normalize', 'stopwords', 'stem'],
        questions: TYPED,
        objectives: [{ metric: 'recall@1', op: '>=' }],
        solution: [{}, { normalize: true, stopwords: true, stem: true }],
      },
    ],
    example: [
      { show: 'trace', question: 't-limit', config: RAW, focus: 'lexical' },
      { show: 'trace', question: 't-limit', config: LEXICAL, focus: 'lexical' },
    ],
  },
  {
    id: 'rag-tfidf',
    block: 2,
    tier: 'beginner',
    kind: 'unit',
    es: {
      title: 'TF e IDF',
      goal: 'Con los 7 trozos de dos guías delante, cuenta a mano: un TF, un DF y dos IDF.',
      theory: {
        what: 'TF es cuántas veces sale un término en un trozo. IDF es cuánto distingue: alto si sale en pocos trozos, casi cero si sale en todos.',
        how: [
          'tf("cola", trozo) = veces que sale ahí',
          'df("cola") = trozos que lo contienen',
          'idf = ln(1 + (N - df + 0.5) / (df + 0.5))',
          'peso = tf * idf   # la base de BM25',
        ],
        when: 'Para entender por qué un trozo gana: comparte con la consulta palabras raras, no palabras frecuentes.',
        whenNot:
          'TF solo premia a quien más repite; IDF solo no mira el trozo. Hacen falta los dos.',
        problems:
          'Dar el mismo peso a todas las palabras. «tarea» sale en casi todos los trozos: su IDF es muy bajo y casi no ordena. La que decide es la palabra rara.',
      },
      example: 'Antes de verlo: de 7 trozos, «tarea» sale en 6. ¿Su IDF será alto o bajo?',
      frames: [
        '«tarea» está casi en todas partes: su IDF es bajo y apenas distingue un trozo de otro.',
        '«exponencial» sale en un solo trozo: su IDF es alto y decide quién gana.',
      ],
    },
    en: {
      title: 'TF and IDF',
      goal: 'With the 7 chunks of two guides in front of you, count by hand: one TF, one DF and two IDFs.',
      theory: {
        what: 'TF is how many times a term appears in a chunk. IDF is how much it tells chunks apart: high if it is in few chunks, near zero if it is in all.',
        how: [
          'tf("cola", chunk) = times it appears there',
          'df("cola") = chunks that contain it',
          'idf = ln(1 + (N - df + 0.5) / (df + 0.5))',
          'weight = tf * idf   # the core of BM25',
        ],
        when: 'To understand why a chunk wins: it shares rare words with the query, not frequent ones.',
        whenNot:
          'TF alone rewards whoever repeats most; IDF alone ignores the chunk. You need both.',
        problems:
          'Giving every word the same weight. "tarea" is in almost every chunk: its IDF is very low and it barely ranks anything. The rare word decides.',
      },
      example:
        'Before you look: out of 7 chunks, "tarea" appears in 6. Will its IDF be high or low?',
      frames: [
        '"tarea" is almost everywhere: its IDF is low and it hardly tells chunks apart.',
        '"exponencial" is in a single chunk: its IDF is high and decides who wins.',
      ],
    },
    tasks: [
      {
        kind: 'calc',
        asks: [
          { kind: 'tf', term: 'cola', chunk: 'docs/colas.md#1', docs: HAND_DOCS },
          { kind: 'df', term: 'cola', docs: HAND_DOCS },
          { kind: 'idf', term: 'cola', docs: HAND_DOCS },
          { kind: 'idf', term: 'prioridad', docs: HAND_DOCS },
        ],
      },
    ],
    example: [
      { show: 'calc', ask: { kind: 'idf', term: 'tarea', docs: HAND_DOCS } },
      { show: 'calc', ask: { kind: 'idf', term: 'exponencial', docs: HAND_DOCS } },
    ],
  },
  {
    id: 'rag-bm25',
    block: 2,
    tier: 'beginner',
    kind: 'unit',
    es: {
      title: 'BM25: k1 y b',
      goal: 'En este índice hay un fichero que repite palabras clave y no lo puedes quitar. Ajusta k1 y b para que los trozos buenos vuelvan arriba.',
      theory: {
        what: 'BM25 suma, por cada palabra de la consulta, su IDF por un TF que se satura. k1 dice cuánto suma repetir; b, cuánto se penaliza a los trozos largos.',
        how: [
          'k1 = 0    # una vez o diez: lo mismo',
          'k1 = 3    # repetir suma mucho',
          'b = 0     # el largo no importa',
          'b = 1     # los trozos largos puntúan menos',
        ],
        when: 'Los valores de fábrica (k1 = 1.2, b = 0.75) bastan casi siempre. Tócalos cuando midas un problema concreto.',
        whenNot:
          'Si el problema es un fichero de ruido, quitarlo del corpus es mejor que afinar. Esto es para cuando no puedes.',
        problems:
          'k1 alto con texto que repite: gana quien más veces dice la palabra, no quien responde. Verás el .lock el primero de la lista léxica. Baja k1.',
      },
      example:
        'Antes de verlo: un trozo del .lock dice «reintentos» cuatro veces y la guía, dos. Con k1 = 3, ¿quién gana?',
      frames: [
        'Con k1 = 3 repetir cuenta mucho: el trozo de ruido se pone el primero.',
        'Con k1 = 0.4 la repetición se satura enseguida y la guía recupera su puesto.',
      ],
    },
    en: {
      title: 'BM25: k1 and b',
      goal: 'This index holds a file that repeats keywords and you cannot remove it. Tune k1 and b so that the good chunks rise back to the top.',
      theory: {
        what: 'BM25 adds, for each query word, its IDF times a TF that saturates. k1 says how much repeating keeps adding; b, how much long chunks are penalized.',
        how: [
          'k1 = 0    # once or ten times: the same',
          'k1 = 3    # repeating adds a lot',
          'b = 0     # length does not matter',
          'b = 1     # long chunks score less',
        ],
        when: 'The defaults (k1 = 1.2, b = 0.75) are nearly always enough. Touch them when you measure a specific problem.',
        whenNot:
          'If the problem is a noise file, removing it from the corpus beats tuning. This is for when you cannot.',
        problems:
          'High k1 with repetitive text: whoever says the word most wins, not whoever answers. You will see the .lock first in the lexical list. Lower k1.',
      },
      example:
        'Before you look: a .lock chunk says "reintentos" four times and the guide, twice. With k1 = 3, who wins?',
      frames: [
        'With k1 = 3 repeating counts a lot: the noise chunk takes first place.',
        'With k1 = 0.4 repetition saturates quickly and the guide takes its place back.',
      ],
    },
    tasks: [
      {
        kind: 'tune',
        base: { ...LEXICAL, sources: ['docs', 'code', 'lock'], k1: 2, b: 0.75 },
        knobs: ['k1', 'b'],
        questions: NOISY,
        objectives: [{ metric: 'mrr', op: '>=' }],
        solution: [{}, { k1: 0.4, b: 0 }],
      },
    ],
    example: [
      {
        show: 'trace',
        question: 'retries',
        config: { ...LEXICAL, sources: ['docs', 'code', 'lock'], k1: 3, b: 0 },
        focus: 'lexical',
      },
      {
        show: 'trace',
        question: 'retries',
        config: { ...LEXICAL, sources: ['docs', 'code', 'lock'], k1: 0.4, b: 0 },
        focus: 'lexical',
      },
    ],
  },
  {
    id: 'rag-topk',
    block: 2,
    tier: 'beginner',
    kind: 'unit',
    es: {
      title: 'Cuántos resultados: k',
      goal: 'Con k = 1 se escapan respuestas que estaban en el segundo o tercer puesto. Sube k lo justo: más aciertos sin alargar el prompt de más.',
      theory: {
        what: 'k es cuántos trozos te quedas de la lista ordenada. Con k alto es más fácil que el bueno esté dentro (recall) y hay más paja alrededor (precisión).',
        how: [
          'buscar(pregunta, k=1)   # o aciertas o nada',
          'buscar(pregunta, k=3)   # margen razonable',
          'buscar(pregunta, k=10)  # casi todo… y mucho relleno',
        ],
        when: 'Elige k mirando dónde suele caer el trozo bueno: si casi siempre está entre los 3 primeros, k = 3.',
        whenNot:
          'Subir k no arregla una búsqueda mala: si el bueno está en el puesto 15, lo que falla es el buscador.',
        problems:
          'Pedir k = 10 «por si acaso»: el recall sube un poco, la precisión cae a 0,10 y el prompt se triplica. Mira las dos cifras a la vez.',
      },
      example: 'Antes de verlo: pasas de k = 1 a k = 10. ¿Qué le pasa a la precisión?',
      frames: [
        'k = 1: precisión alta, pero se quedan fuera las respuestas del segundo y tercer puesto.',
        'k = 3: entran casi todas con un prompt moderado.',
        'k = 10: apenas más aciertos, un trozo bueno de cada diez y el doble de tokens.',
      ],
    },
    en: {
      title: 'How many results: k',
      goal: 'With k = 1 you miss answers sitting in second or third place. Raise k just enough: more hits without stretching the prompt too far.',
      theory: {
        what: 'k is how many chunks you keep from the ranked list. A high k makes it likelier the right one is in (recall) and brings more padding around it (precision).',
        how: [
          'search(question, k=1)   # hit or nothing',
          'search(question, k=3)   # reasonable margin',
          'search(question, k=10)  # nearly all… and lots of filler',
        ],
        when: 'Pick k by looking at where the right chunk usually lands: if it is nearly always in the top 3, k = 3.',
        whenNot:
          'Raising k does not fix a bad search: if the right chunk is in place 15, the searcher is what fails.',
        problems:
          'Asking for k = 10 "just in case": recall goes up a little, precision drops to 0.10 and the prompt triples. Watch both figures together.',
      },
      example: 'Before you look: you go from k = 1 to k = 10. What happens to precision?',
      frames: [
        'k = 1: high precision, but answers in second and third place are left out.',
        'k = 3: nearly all of them get in with a moderate prompt.',
        'k = 10: hardly more hits, one good chunk in ten and twice the tokens.',
      ],
    },
    tasks: [
      {
        kind: 'tune',
        base: { ...LEXICAL, k: 1 },
        knobs: ['k'],
        questions: DEV_FOUND,
        objectives: [
          { metric: 'recall@k', op: '>=' },
          { metric: 'tokens', op: '<=' },
        ],
        solution: [{}, { k: 3 }],
      },
    ],
    example: [
      {
        show: 'metrics',
        config: { ...LEXICAL, k: 1 },
        questions: DEV_FOUND,
        keys: ['recall@k', 'precision', 'tokens'],
      },
      {
        show: 'metrics',
        config: { ...LEXICAL, k: 3 },
        questions: DEV_FOUND,
        keys: ['recall@k', 'precision', 'tokens'],
      },
      {
        show: 'metrics',
        config: { ...LEXICAL, k: 10 },
        questions: DEV_FOUND,
        keys: ['recall@k', 'precision', 'tokens'],
      },
    ],
  },
  {
    id: 'rag-boss-wiki',
    block: 2,
    tier: 'beginner',
    kind: 'boss',
    limit: 300,
    es: {
      title: 'Nadie encuentra nada en la wiki',
      goal: 'Deja el buscador léxico de la wiki encontrando lo que la gente escribe de verdad, aunque el índice tenga ruido.',
      story:
        'El canal #ayuda se ha llenado de «el buscador no encuentra nada». Miras el registro: consultas en mayúsculas y sin acentos, un buscador que compara letra a letra y, desde ayer, las dependencias indexadas porque alguien quería «buscar versiones».',
      tasks: [
        'Haz que las consultas escritas con prisa encuentren su respuesta a la primera.',
        'Calcula el IDF de «reintentos» en las dos guías: ¿distingue o no?',
        'Con el ruido dentro, ajusta k1, b y k: los buenos arriba y un prompt corto.',
      ],
    },
    en: {
      title: 'Nobody finds anything in the wiki',
      goal: 'Leave the wiki lexical search finding what people really type, even with noise in the index.',
      story:
        'The #help channel is full of "search finds nothing". You check the log: queries in caps and without accents, a search that compares letter by letter and, since yesterday, the dependencies indexed because someone wanted to "search versions".',
      tasks: [
        'Make the hurried queries find their answer in first place.',
        'Work out the IDF of "reintentos" in the two guides: does it tell chunks apart or not?',
        'With the noise inside, tune k1, b and k: good ones on top and a short prompt.',
      ],
    },
    tasks: [
      {
        kind: 'tune',
        base: { ...RAW, k: 1 },
        knobs: ['normalize', 'stopwords', 'stem'],
        questions: TYPED,
        objectives: [{ metric: 'recall@1', op: '>=' }],
        solution: [{ normalize: true, stopwords: true, stem: true }],
      },
      { kind: 'calc', asks: [{ kind: 'idf', term: 'reintentos', docs: HAND_DOCS }] },
      {
        kind: 'tune',
        base: { ...LEXICAL, sources: ['docs', 'code', 'lock'], k1: 3, b: 1, k: 8 },
        knobs: ['k1', 'b', 'k'],
        questions: NOISY,
        objectives: [
          { metric: 'mrr', op: '>=' },
          { metric: 'tokens', op: '<=' },
        ],
        solution: [{ k1: 0.4, b: 0, k: 3 }],
      },
    ],
  },

  /* ---------- Bloque 3: búsqueda semántica ---------- */
  {
    id: 'rag-embed',
    block: 3,
    tier: 'beginner',
    kind: 'unit',
    es: {
      title: 'Embeddings',
      goal: 'Calcula tres dimensiones del embedding de una frase de la guía: cuánto habla de esperar, de reintentar y de tiempo.',
      theory: {
        what: 'Un embedding convierte un texto en un vector: una lista de números que dice de qué habla. Textos con el mismo significado dan vectores parecidos, aunque no compartan palabras.',
        how: [
          'v = embed("volver a intentarlo")',
          '# aquí: una dimensión por concepto',
          '# reintentar: 2, esperar: 0, fallar: 0…',
          '# un modelo real: 384 números aprendidos',
        ],
        when: 'Cuando quien pregunta no usa las palabras del documento: sinónimos, otra forma de decirlo u otro idioma.',
        whenNot:
          'Un identificador exacto (QueueFull, un puerto) no «significa» nada para el modelo: ahí gana la búsqueda léxica.',
        problems:
          'Creer que el vector guarda las palabras. «reintento» y «retry» caen en la misma dimensión: no sabrás cuál decía el texto. Guarda el trozo junto a su vector.',
      },
      example:
        'Antes de verlo: «volver a intentarlo» no contiene la palabra «reintento». ¿Cuánto valdrá su dimensión de reintentar?',
      frames: [
        '«volver a» e «intentarlo» nombran el mismo concepto: la dimensión vale 2 sin compartir una sola palabra con la guía.',
      ],
    },
    en: {
      title: 'Embeddings',
      goal: 'Work out three dimensions of the embedding of a sentence from the guide: how much it talks about waiting, retrying and time.',
      theory: {
        what: 'An embedding turns a text into a vector: a list of numbers that says what it is about. Texts with the same meaning give similar vectors, even with no words in common.',
        how: [
          'v = embed("volver a intentarlo")',
          '# here: one dimension per concept',
          '# retry: 2, wait: 0, fail: 0…',
          '# a real model: 384 learned numbers',
        ],
        when: 'When whoever asks does not use the words of the document: synonyms, another phrasing or another language.',
        whenNot:
          'An exact identifier (QueueFull, a port) "means" nothing to the model: lexical search wins there.',
        problems:
          'Thinking the vector keeps the words. "reintento" and "retry" land on the same dimension: you cannot tell which the text said. Store the chunk next to its vector.',
      },
      example:
        'Before you look: "volver a intentarlo" does not contain the word "reintento". What will its retry dimension be?',
      frames: [
        '"volver a" and "intentarlo" name the same concept: the dimension is 2 without sharing a single word with the guide.',
      ],
    },
    tasks: [
      {
        kind: 'calc',
        asks: [
          { kind: 'count', text: WAIT_SENTENCE, concept: 'wait' },
          { kind: 'count', text: WAIT_SENTENCE, concept: 'retry' },
          { kind: 'count', text: WAIT_SENTENCE, concept: 'time' },
        ],
      },
    ],
    example: [
      { show: 'calc', ask: { kind: 'count', text: 'volver a intentarlo', concept: 'retry' } },
    ],
  },
  {
    id: 'rag-cosine',
    block: 3,
    tier: 'beginner',
    kind: 'unit',
    es: {
      title: 'Similitud coseno',
      goal: 'Calcula el coseno entre la pregunta y dos frases de la guía, y verás cuál es su vecina más cercana.',
      theory: {
        what: 'El coseno mide si dos vectores apuntan hacia el mismo sitio: 1 si hablan de lo mismo en la misma proporción, 0 si no comparten ningún concepto.',
        how: [
          'cos(a, b) = a·b / (|a| * |b|)',
          'a·b = a1*b1 + a2*b2 + …',
          '|a| = raiz(a1² + a2² + …)',
          'top = los k trozos con mayor coseno',
        ],
        when: 'Para ordenar los trozos por parecido con la pregunta: los k de mayor coseno son sus vecinos más cercanos.',
        whenNot:
          'No compares cosenos con puntuaciones de BM25: son escalas distintas. Para juntar las dos listas se usan los puestos.',
        problems:
          'Usar el producto escalar sin dividir: un trozo largo gana solo por tener números más grandes. Divide por las longitudes (o normaliza los vectores al guardarlos).',
      },
      example:
        'Antes de verlo: dos textos con vectores (1, 1, 0) y (2, 2, 0). Uno es el doble de largo. ¿Qué coseno tienen?',
      frames: [
        'Apuntan exactamente al mismo sitio: el coseno es 1 aunque uno sea el doble de largo.',
      ],
    },
    en: {
      title: 'Cosine similarity',
      goal: 'Work out the cosine between the question and two sentences from the guide, and see which is its nearest neighbour.',
      theory: {
        what: 'Cosine measures whether two vectors point the same way: 1 if they talk about the same things in the same proportion, 0 if they share no concept.',
        how: [
          'cos(a, b) = a·b / (|a| * |b|)',
          'a·b = a1*b1 + a2*b2 + …',
          '|a| = sqrt(a1² + a2² + …)',
          'top = the k chunks with highest cosine',
        ],
        when: 'To rank chunks by similarity to the question: the k with the highest cosine are its nearest neighbours.',
        whenNot:
          'Do not compare cosines with BM25 scores: they are different scales. To merge both lists you use ranks.',
        problems:
          'Using the dot product without dividing: a long chunk wins just for having bigger numbers. Divide by the lengths (or normalize vectors when you store them).',
      },
      example:
        'Before you look: two texts with vectors (1, 1, 0) and (2, 2, 0). One is twice as long. What is their cosine?',
      frames: [
        'They point exactly the same way: the cosine is 1 even though one is twice as long.',
      ],
    },
    tasks: [
      {
        kind: 'calc',
        asks: [
          {
            kind: 'cosine',
            a: '¿Cuánto tarda en volver a intentarlo?',
            b: WAIT_SENTENCE,
            concepts: ['retry', 'wait', 'time'],
          },
          {
            kind: 'cosine',
            a: '¿Cuánto tarda en volver a intentarlo?',
            b: 'Con delay la tarea espera esos segundos antes de estar disponible.',
            concepts: ['retry', 'wait', 'time'],
          },
        ],
      },
    ],
    example: [
      {
        show: 'calc',
        ask: {
          kind: 'cosine',
          a: 'reintento con espera',
          b: 'retry, retry: wait and wait',
          concepts: ['retry', 'wait', 'time'],
        },
      },
    ],
  },
  {
    id: 'rag-semantic',
    block: 3,
    tier: 'beginner',
    kind: 'unit',
    es: {
      title: 'Búsqueda semántica',
      goal: 'Estas preguntas usan otras palabras, o el otro idioma, que la documentación. Consigue que todas encuentren su respuesta entre los 3 primeros.',
      theory: {
        what: 'La búsqueda semántica convierte la pregunta en un vector y devuelve los trozos de mayor coseno. Encuentra por significado, no por palabras.',
        how: [
          'vectores = embed(trozos)      # una vez, al indexar',
          'q = embed(pregunta)           # en cada consulta',
          'top = mayor_coseno(q, vectores, k=3)',
        ],
        when: 'Con preguntas de personas: «¿por qué se ejecutó dos veces?» frente a un documento que dice «tareas duplicadas».',
        whenNot:
          'Con nombres exactos falla: «backoff_seconds» no es un concepto y su trozo no sale el primero. Para eso sigue haciendo falta BM25.',
        problems:
          'Quedarse solo con BM25 porque «funciona en mis pruebas» (hechas con tus palabras). Con las de otra persona, la lista léxica sale vacía. Mide con paráfrasis.',
      },
      example:
        'Antes de verlo: «Why did my job run twice?» contra una guía en castellano. ¿Qué encontrará BM25?',
      frames: [
        'BM25 no encuentra nada útil: la pregunta y la guía no comparten palabras.',
        'La semántica reconoce «job», «run» y «twice» como tarea, ejecutar y dos veces, y acierta.',
      ],
    },
    en: {
      title: 'Semantic search',
      goal: 'These questions use other words, or the other language, than the documentation. Get all of them to find their answer in the top 3.',
      theory: {
        what: 'Semantic search turns the question into a vector and returns the chunks with the highest cosine. It finds by meaning, not by words.',
        how: [
          'vectors = embed(chunks)       # once, when indexing',
          'q = embed(question)           # on every query',
          'top = highest_cosine(q, vectors, k=3)',
        ],
        when: 'With questions from people: "why did it run twice?" against a document that says "duplicated tasks".',
        whenNot:
          'It fails with exact names: "backoff_seconds" is not a concept and its chunk does not come first. You still need BM25 for that.',
        problems:
          'Sticking to BM25 because "it works in my tests" (written in your words). With someone else\'s, the lexical list comes back empty. Measure with paraphrases.',
      },
      example:
        'Before you look: "Why did my job run twice?" against a guide in Spanish. What will BM25 find?',
      frames: [
        'BM25 finds nothing useful: the question and the guide share no words.',
        'Semantic search reads "job", "run" and "twice" as task, run and two times, and hits.',
      ],
    },
    tasks: [
      {
        kind: 'tune',
        base: LEXICAL,
        knobs: ['mode'],
        only: { mode: ['lexical', 'semantic'] },
        questions: PARAPHRASES,
        objectives: [{ metric: 'recall@3', op: '>=' }],
        solution: [{}, { mode: 'semantic' }],
      },
    ],
    example: [
      { show: 'trace', question: 'twice', config: LEXICAL, focus: 'lexical' },
      { show: 'trace', question: 'twice', config: { mode: 'semantic' }, focus: 'semantic' },
    ],
  },
  {
    id: 'rag-boss-words',
    block: 3,
    tier: 'beginner',
    kind: 'boss',
    limit: 300,
    es: {
      title: 'La consulta con otras palabras',
      goal: 'Demuestra con números por qué el bot no entiende a quien pregunta en inglés, y arréglalo.',
      story:
        'La oficina de Lisboa escribe en inglés y la mitad de las guías están en castellano. «Vuestro bot no sabe nada», dicen. Tu compañera quiere pruebas antes de cambiar el buscador: un coseno calculado a mano y la medida antes y después.',
      tasks: [
        'Calcula cuánto habla del concepto «dos veces» la frase de la guía y su coseno con la pregunta en inglés.',
        'Cambia el buscador para que las preguntas con otras palabras acierten entre los 3 primeros.',
      ],
    },
    en: {
      title: 'The query in other words',
      goal: 'Show with numbers why the bot does not understand people who ask in English, and fix it.',
      story:
        'The Lisbon office writes in English and half the guides are in Spanish. "Your bot knows nothing", they say. Your teammate wants proof before changing the search: a cosine worked out by hand and the measure before and after.',
      tasks: [
        'Work out how much the guide sentence talks about the "twice" concept and its cosine with the English question.',
        'Change the search so that questions in other words hit in the top 3.',
      ],
    },
    tasks: [
      {
        kind: 'calc',
        asks: [
          {
            kind: 'count',
            text: 'Una tarea puede ejecutarse dos veces si el worker muere a medias.',
            concept: 'twice',
          },
          {
            kind: 'cosine',
            a: 'Why did my job run twice?',
            b: 'Una tarea puede ejecutarse dos veces si el worker muere a medias.',
            concepts: ['task', 'twice', 'start', 'dead'],
          },
        ],
      },
      {
        kind: 'tune',
        base: { ...LEXICAL, k: 1 },
        knobs: ['mode', 'k'],
        only: { mode: ['lexical', 'semantic'] },
        questions: PARAPHRASES,
        objectives: [
          { metric: 'recall@k', op: '>=' },
          { metric: 'tokens', op: '<=' },
        ],
        solution: [{ mode: 'semantic', k: 3 }],
      },
    ],
  },
  {
    id: 'rag-final-beginner',
    block: 3,
    tier: 'beginner',
    kind: 'final',
    limit: 480,
    es: {
      title: 'Tu primer buscador',
      goal: 'Monta de cero el buscador de la documentación de Colmena: corpus, troceado, tokens y la búsqueda que mejor encuentra.',
      story:
        'Te toca la primera tarea «de verdad» del equipo: el buscador de la documentación. Lo que hay es un prototipo de una tarde: lo indexa todo, corta cada 15 palabras, compara letra a letra y devuelve un único resultado. La demo es a las 12.',
      tasks: [
        'Corpus y troceado: sin secretos ni ruido, y con todas las respuestas enteras.',
        'Tokens: que las consultas escritas con prisa encuentren su respuesta a la primera.',
        'Búsqueda: elige el buscador y el k que más preguntas de personas aciertan sin alargar el prompt.',
      ],
    },
    en: {
      title: 'Your first search engine',
      goal: 'Build the Colmena documentation search from scratch: corpus, chunking, tokens and the search that finds best.',
      story:
        'You get the first "real" task on the team: the documentation search. What exists is an afternoon prototype: it indexes everything, cuts every 15 words, compares letter by letter and returns a single result. The demo is at 12.',
      tasks: [
        'Corpus and chunking: no secrets, no noise, and every answer whole.',
        'Tokens: make the hurried queries find their answer in first place.',
        'Search: pick the searcher and the k that hit most questions from people without stretching the prompt.',
      ],
    },
    tasks: [
      {
        kind: 'tune',
        base: { ...LEXICAL, ...EVERYTHING, chunker: 'fixed', size: 15 },
        knobs: ['sources', 'chunker', 'size', 'overlap'],
        questions: DEV_FOUND,
        objectives: [
          { metric: 'whole', op: '>=' },
          { metric: 'recall@3', op: '>=' },
          { metric: 'secrets', op: '<=' },
          { metric: 'noise', op: '<=' },
          { metric: 'tokens', op: '<=' },
        ],
        solution: [{ sources: ['docs', 'code'], chunker: 'structure', size: 60, overlap: 0 }],
      },
      {
        kind: 'tune',
        base: { ...RAW, k: 1 },
        knobs: ['normalize', 'stopwords', 'stem'],
        questions: TYPED,
        objectives: [{ metric: 'recall@1', op: '>=' }],
        solution: [{ normalize: true, stopwords: true, stem: true }],
      },
      {
        kind: 'tune',
        base: { ...LEXICAL, k: 1 },
        knobs: ['mode', 'k'],
        only: { mode: ['lexical', 'semantic'] },
        questions: [...DEV_FOUND, ...PARAPHRASES.filter((id) => !DEV_FOUND.includes(id))],
        objectives: [
          { metric: 'recall@k', op: '>=' },
          { metric: 'tokens', op: '<=' },
        ],
        solution: [{ mode: 'semantic', k: 3 }],
      },
    ],
  },
]
