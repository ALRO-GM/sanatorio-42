/**
 * Nivel avanzado: evaluar, afinar y producción. Bloques 7 a 9 y su jefe
 * final: medir con un conjunto de referencia (recall@k, precisión, MRR) en vez
 * de mirar a ojo, afinar sin engañarse (fugas, validación cruzada, coste) y lo
 * que hace falta para que sea un servicio (indexado incremental, caché, API y
 * diagnóstico por etapas).
 */

import { DEV_FOUND, LEAKED, TEST } from './sets.js'
import type { PickCase, Setup, UnitDef } from './types.js'

const LEXICAL: Setup = { mode: 'lexical' }
const SEMANTIC: Setup = { mode: 'semantic' }

/** Un índice con la fuga dentro y un troceado malo: en desarrollo parece perfecto. */
const LEAKY: Setup = { ...LEXICAL, sources: ['docs', 'code', 'eval'], chunker: 'fixed', size: 15 }

/** Reordenarlo todo y recuperar diez: aciertos de sobra y latencia también. */
const LAVISH: Setup = { rerank: true, depth: 20, k: 10 }

const TIGHT: Setup = { k: 5, budget: 120, order: 'worst' }

/** Las preguntas de desarrollo, en tres particiones. */
const FOLDS = [DEV_FOUND.slice(0, 5), DEV_FOUND.slice(5, 9), DEV_FOUND.slice(9)]

const SAMPLE = ['retries', 'backoff', 'shutdown', 'parallel', 'dead']

/** Cuatro preguntas que se pierden cada una en una etapa distinta. */
const LOST: PickCase[] = [
  { of: 'stage', question: 'full', config: { ...LEXICAL, chunker: 'fixed', size: 15 } },
  { of: 'stage', question: 'twice', config: LEXICAL },
  { of: 'stage', question: 'retries', config: TIGHT },
  { of: 'stage', question: 'legacy', config: { minSupport: 5 } },
]

export const ADVANCED: UnitDef[] = [
  /* ---------- Bloque 7: evaluar ---------- */
  {
    id: 'rag-recall',
    block: 7,
    tier: 'advanced',
    kind: 'unit',
    es: {
      title: 'recall@k',
      goal: 'Con las listas de cinco preguntas delante, calcula a mano el recall@3 y el recall@1 del buscador léxico.',
      theory: {
        what: 'recall@k es la parte de las preguntas cuyo trozo bueno está entre los k primeros. Mide si el buscador trae la respuesta.',
        how: [
          'aciertos = preguntas con un bueno en el top k',
          'recall@k = aciertos / preguntas',
          '3 de 5 -> recall@3 = 0.60',
        ],
        when: 'Es la primera cifra: lo que no se recupera no se puede responder.',
        whenNot: 'No dice en qué puesto queda el bueno.',
        problems:
          'Comparar recalls con k distinto: recall@10 siempre gana a recall@3. Di siempre la k.',
      },
      example:
        'Antes de verlo: de 5 preguntas, 2 tienen su trozo bueno el primero y otra, el tercero. ¿Cuánto vale recall@1?',
      frames: [
        'Solo cuentan las que aciertan dentro de los k primeros: con k = 1, el tercer puesto no vale.',
      ],
    },
    en: {
      title: 'recall@k',
      goal: 'With the lists for five questions in front of you, work out recall@3 and recall@1 of the lexical search by hand.',
      theory: {
        what: 'recall@k is the share of questions whose right chunk is in the top k. It measures whether search brings the answer.',
        how: [
          'hits = questions with a right chunk in top k',
          'recall@k = hits / questions',
          '3 out of 5 -> recall@3 = 0.60',
        ],
        when: 'It is the first figure: what is not retrieved cannot be answered.',
        whenNot: 'It does not say which place the right chunk takes.',
        problems:
          'Comparing recalls with different k: recall@10 always beats recall@3. Always state the k.',
      },
      example:
        'Before you look: out of 5 questions, 2 have their right chunk first and another, third. What is recall@1?',
      frames: [
        'Only those that hit inside the top k count: with k = 1, third place is worth nothing.',
      ],
    },
    tasks: [
      {
        kind: 'calc',
        asks: [
          { kind: 'recall', questions: SAMPLE, k: 3, config: LEXICAL },
          { kind: 'recall', questions: SAMPLE, k: 1, config: LEXICAL },
        ],
      },
    ],
    example: [{ show: 'calc', ask: { kind: 'recall', questions: SAMPLE, k: 1 } }],
  },
  {
    id: 'rag-ranking',
    block: 7,
    tier: 'advanced',
    kind: 'unit',
    es: {
      title: 'Precisión y MRR',
      goal: 'Calcula la precisión@3 de una pregunta y el MRR de cuatro: cuánta paja hay y en qué puesto llega la respuesta.',
      theory: {
        what: 'La precisión@k es la parte de los k recuperados que sirve. El MRR es la media de 1/puesto del primer acierto.',
        how: [
          'precision@3 = buenos entre los 3 / 3',
          'puestos 1, 3, -, 2',
          'MRR = (1/1 + 1/3 + 0 + 1/2) / 4 = 0.46',
        ],
        when: 'MRR para comparar reordenados; precisión para el relleno.',
        whenNot: 'Con una respuesta buena por pregunta, la precisión@k no pasa de 1/k.',
        problems: 'Mirar solo recall: con igual recall@5, el bueno puede ir primero o quinto.',
      },
      example:
        'Antes de verlo: el trozo bueno queda primero, tercero, quinto y segundo. ¿El MRR estará más cerca de 1 o de 0,5?',
      frames: ['Cada pregunta aporta 1 entre su puesto: el primero vale 1 y el quinto, solo 0,2.'],
    },
    en: {
      title: 'Precision and MRR',
      goal: 'Work out precision@3 for one question and the MRR of four: how much padding there is and in which place the answer arrives.',
      theory: {
        what: 'precision@k is the useful share of the k retrieved. MRR is the mean of 1/rank of the first hit.',
        how: [
          'precision@3 = good ones in the 3 / 3',
          'ranks 1, 3, -, 2',
          'MRR = (1/1 + 1/3 + 0 + 1/2) / 4 = 0.46',
        ],
        when: 'MRR, to compare rerankers; precision, to watch filler.',
        whenNot: 'With one right answer per question, precision@k never exceeds 1/k.',
        problems: 'Recall alone: with the same recall@5, the right chunk can be first or fifth.',
      },
      example:
        'Before you look: the right chunk lands first, third, fifth and second. Will MRR be closer to 1 or to 0.5?',
      frames: ['Each question adds 1 over its rank: first place is worth 1 and fifth, only 0.2.'],
    },
    tasks: [
      {
        kind: 'calc',
        asks: [
          { kind: 'precision', question: 'retries', k: 3 },
          { kind: 'mrr', questions: ['heartbeat', 'twice', 'dead', 'legacy'] },
        ],
      },
    ],
    example: [
      {
        show: 'calc',
        ask: { kind: 'mrr', questions: ['retries', 'backoff', 'shutdown', 'parallel'] },
      },
    ],
  },
  {
    id: 'rag-goldset',
    block: 7,
    tier: 'advanced',
    kind: 'unit',
    es: {
      title: 'El conjunto de referencia',
      goal: 'Para medir hace falta saber cuál es la respuesta buena. Marca, entre los cinco primeros resultados de dos preguntas, los trozos que de verdad la contienen.',
      theory: {
        what: 'Un conjunto de referencia es una lista de preguntas con el sitio exacto del corpus que las responde. Es con lo que se compara cada resultado.',
        how: [
          '{"pregunta": "Which Python version do I need?",',
          ' "fuentes": [["docs/instalacion.md", 5, 5],',
          '             ["README.md", 7, 7]]}',
        ],
        when: 'Antes de afinar nada: 20 preguntas reales valen más que 200 inventadas.',
        whenNot:
          'No lo escribas mirando lo que devuelve tu buscador: medirías que coincide consigo mismo.',
        problems: 'Anotar una fuente cuando hay dos: acertar con la otra cuenta como fallo.',
      },
      example:
        'Antes de verlo: la versión de Python sale en dos documentos y solo anotas uno. ¿Qué pasa si el buscador trae el otro?',
      frames: [
        'Los dos trozos responden: con una sola anotada, traer el otro contaría como fallo.',
      ],
    },
    en: {
      title: 'The reference set',
      goal: 'To measure you need to know which answer is right. Among the top five results for two questions, tick the chunks that really hold it.',
      theory: {
        what: 'A reference set is a list of questions with the exact place in the corpus that answers them. It is what every result is compared with.',
        how: [
          '{"question": "Which Python version do I need?",',
          ' "sources": [["docs/instalacion.md", 5, 5],',
          '             ["README.md", 7, 7]]}',
        ],
        when: 'Before tuning anything: 20 real questions beat 200 invented ones.',
        whenNot:
          'Do not write it from your search results: you would measure that it agrees with itself.',
        problems: 'Annotating one source when there are two: hitting the other counts as a miss.',
      },
      example:
        'Before you look: the Python version is in two documents and you annotate only one. What if search brings the other?',
      frames: [
        'Both chunks answer: with only one annotated, bringing the other would count as a miss.',
      ],
    },
    tasks: [
      {
        kind: 'pick',
        cases: [
          { of: 'relevant', question: 'python', show: 5 },
          { of: 'relevant', question: 'priority', show: 5 },
        ],
      },
    ],
    example: [{ show: 'trace', question: 'python', focus: 'fusion' }],
  },
  {
    id: 'rag-eyeball',
    block: 7,
    tier: 'advanced',
    kind: 'unit',
    es: {
      title: 'No evaluar a ojo',
      goal: 'Hay tres configuraciones y dos preguntas de muestra en las que una parece la mejor. Elige la que mejor recupera de verdad: mídelas.',
      theory: {
        what: 'Evaluar a ojo es probar tres preguntas que se te ocurren y decidir. Las tuyas se parecen a tu documentación y salen bien.',
        how: [
          'for config in candidatas:',
          '    medir(config, conjunto)   # el mismo',
          'elegir por la cifra, no por la demo',
        ],
        when: 'En cada cambio: una mejora que no mueve la cifra no es una mejora.',
        whenNot: 'Lee también las preguntas que fallan: dicen por qué.',
        problems:
          'Decidir por la demo: A clava las dos preguntas de muestra y pierde en el conjunto.',
      },
      example:
        'Antes de verlo: A acierta las dos preguntas de la demo y B, ninguna. ¿Cuál acertará más en las 13 del conjunto?',
      frames: [
        'Léxica en las 13 preguntas: acierta las de la demo, y aun así se deja tres de cada trece.',
        'Semántica: falla justo las de la demo y acierta más en el conjunto.',
      ],
    },
    en: {
      title: 'Do not eyeball it',
      goal: 'There are three configurations and two sample questions where one looks best. Pick the one that really retrieves best: measure them.',
      theory: {
        what: 'Eyeballing means trying three questions that come to mind and deciding. Yours look like your documentation and nearly always work.',
        how: [
          'for config in candidates:',
          '    measure(config, dataset)   # the same one',
          'choose by the figure, not by the demo',
        ],
        when: 'On every change: an improvement that does not move the figure is not one.',
        whenNot: 'The figure is not everything: read the failing questions too, they say why.',
        problems: 'Deciding by the demo: A nails both sample questions and loses on the set.',
      },
      example:
        'Before you look: A gets both demo questions and B, neither. Which will hit more of the 13 in the set?',
      frames: [
        'Lexical on the 13 questions: it gets the demo ones, and still drops three in thirteen.',
        'Semantic: it misses exactly the demo ones and hits more on the set.',
      ],
    },
    tasks: [
      {
        kind: 'pick',
        cases: [
          {
            of: 'best',
            presets: { A: LEXICAL, B: SEMANTIC, C: { ...LEXICAL, chunker: 'fixed', size: 20 } },
            questions: DEV_FOUND,
            demo: ['function', 'legacy'],
            metric: 'recall@3',
          },
        ],
      },
    ],
    example: [
      { show: 'metrics', config: LEXICAL, questions: DEV_FOUND, keys: ['recall@3', 'mrr'] },
      { show: 'metrics', config: SEMANTIC, questions: DEV_FOUND, keys: ['recall@3', 'mrr'] },
    ],
  },
  {
    id: 'rag-boss-better',
    block: 7,
    tier: 'advanced',
    kind: 'boss',
    limit: 360,
    es: {
      title: '¿Ha mejorado o lo parece?',
      goal: 'Decide con cifras cuál de las tres ramas se despliega.',
      story:
        'Hay tres ramas abiertas y cada autor jura que la suya «va mucho mejor»: uno enseña una captura, otra una demo de dos preguntas. El despliegue es a las 17:00 y nadie ha medido nada. Te toca a ti.',
      tasks: [
        'Calcula el recall@3 y el MRR de la rama semántica con las cinco preguntas de control.',
        'Mide las tres ramas con el conjunto entero y elige la de mayor MRR.',
      ],
    },
    en: {
      title: 'Is it better or does it just look it?',
      goal: 'Decide with figures which of the three branches gets deployed.',
      story:
        'Three branches are open and each author swears theirs "works much better": one shows a screenshot, another a two-question demo. Deploy is at 17:00 and nobody has measured anything. It is on you.',
      tasks: [
        'Work out recall@3 and MRR of the semantic branch on the five control questions.',
        'Measure the three branches on the whole set and pick the one with the highest MRR.',
      ],
    },
    tasks: [
      {
        kind: 'calc',
        asks: [
          {
            kind: 'recall',
            questions: ['health', 'function', 'priority', 'legacy', 'dead'],
            k: 3,
            config: SEMANTIC,
          },
          {
            kind: 'mrr',
            questions: ['health', 'function', 'priority', 'legacy', 'dead'],
            config: SEMANTIC,
          },
        ],
      },
      {
        kind: 'pick',
        cases: [
          {
            of: 'best',
            presets: { A: LEXICAL, B: {}, C: { weight: 0.7 } },
            questions: DEV_FOUND,
            demo: ['function', 'dead'],
            metric: 'mrr',
          },
        ],
      },
    ],
  },

  /* ---------- Bloque 8: afinar sin sobreajustar ---------- */
  {
    id: 'rag-leak',
    block: 8,
    tier: 'advanced',
    kind: 'unit',
    es: {
      title: 'Fugas del conjunto de evaluación',
      goal: 'En desarrollo este RAG responde bien a todo. Compruébalo con las preguntas apartadas, encuentra el porqué y arréglalo de verdad.',
      theory: {
        what: 'Hay fuga cuando las preguntas de evaluación, o sus respuestas, llegan al sistema que evalúas. La cifra sube sin que el sistema mejore.',
        how: [
          'eval/preguntas.jsonl   # fuera del índice',
          'dev  -> para probar y afinar',
          'test -> una vez, al final',
        ],
        when: 'Sospecha de un 1,00: casi nunca es talento.',
        whenNot: 'Cada vez que miras test para decidir algo, deja de servir como prueba.',
        problems:
          'Indexar el repositorio con la carpeta eval dentro: el bot copia la respuesta. «Fugas en el índice» lo delata.',
      },
      example:
        'Antes de verlo: el troceado parte las frases, pero en desarrollo todo coincide. ¿Qué pasará con preguntas que no están en el fichero de evaluación?',
      frames: [
        'En desarrollo, todo coincide: las respuestas salen copiadas del fichero de evaluación.',
        'Con las preguntas apartadas, la cifra de verdad: el troceado seguía roto.',
        'Sin la fuga y con buen troceado, desarrollo y prueba dicen lo mismo.',
      ],
    },
    en: {
      title: 'Evaluation-set leaks',
      goal: 'In development this RAG answers everything right. Check it with the held-out questions, find out why and fix it for real.',
      theory: {
        what: 'A leak is when evaluation questions, or their answers, reach the system you evaluate. The figure rises without the system improving.',
        how: [
          'eval/preguntas.jsonl   # out of the index',
          'dev  -> to try things and tune',
          'test -> once, at the end',
        ],
        when: 'Be suspicious of a 1.00: it is hardly ever talent.',
        whenNot: 'Each look at test to decide something wears it out.',
        problems:
          'Indexing the repository with the eval folder inside: the bot copies the answer. "Leaks in the index" gives it away.',
      },
      example:
        'Before you look: chunking splits the sentences, yet in development everything matches. What will happen with questions that are not in the evaluation file?',
      frames: [
        'In development everything matches: answers are copied from the evaluation file.',
        'With the held-out questions, the real figure: chunking was still broken.',
        'With no leak and good chunking, development and test say the same.',
      ],
    },
    tasks: [
      {
        kind: 'tune',
        base: LEAKY,
        knobs: ['sources', 'chunker', 'size'],
        questions: TEST,
        dev: LEAKED,
        objectives: [
          { metric: 'match', op: '>=' },
          { metric: 'leaks', op: '<=' },
        ],
        solution: [{}, { sources: ['docs', 'code'], chunker: 'structure', size: 60 }],
      },
    ],
    example: [
      { show: 'metrics', config: LEAKY, questions: LEAKED, keys: ['match', 'answers', 'leaks'] },
      { show: 'metrics', config: LEAKY, questions: TEST, keys: ['match', 'answers', 'leaks'] },
      { show: 'metrics', config: LEXICAL, questions: TEST, keys: ['match', 'answers', 'leaks'] },
    ],
  },
  {
    id: 'rag-crossval',
    block: 8,
    tier: 'advanced',
    kind: 'unit',
    es: {
      title: 'Validación cruzada',
      goal: 'Calcula la media de recall@3 en tres particiones para la búsqueda léxica y para la semántica: así una partición con suerte no decide.',
      theory: {
        what: 'La validación cruzada parte las preguntas en grupos y mide en cada uno. Cuenta la media y cuánto varía.',
        how: [
          'grupos = partir(preguntas, 3)',
          'notas = [medir(config, g) for g in grupos]',
          'media = sum(notas) / 3',
        ],
        when: 'Con pocas preguntas: una sola medida depende demasiado de cuáles te tocaron.',
        whenNot: 'No sustituye al test: sigue siendo desarrollo, y de tanto afinar se sobreajusta.',
        problems:
          'Elegir por el mejor grupo. Si las notas son 1,00, 0,50 y 0,75, la configuración vale 0,75, no 1,00.',
      },
      example:
        'Antes de verlo: una configuración saca 1,00 en un grupo y 0,50 en otro. ¿Te fías de alguna de las dos cifras?',
      frames: ['Tres grupos, tres notas distintas: la media es la que se compara.'],
    },
    en: {
      title: 'Cross-validation',
      goal: 'Work out the mean recall@3 over three folds for lexical and for semantic search: that way one lucky fold does not decide.',
      theory: {
        what: 'Cross-validation splits the questions into groups and measures on each. What counts is the mean and how much it varies.',
        how: [
          'folds = split(questions, 3)',
          'scores = [measure(config, f) for f in folds]',
          'mean = sum(scores) / 3',
        ],
        when: 'With few questions: one measure depends too much on which you got.',
        whenNot: 'It does not replace test: enough tuning overfits it too.',
        problems:
          'Choosing by the best fold. If the scores are 1.00, 0.50 and 0.75, the configuration is worth 0.75, not 1.00.',
      },
      example:
        'Before you look: a configuration scores 1.00 on one fold and 0.50 on another. Do you trust either figure?',
      frames: ['Three folds, three different scores: the mean is what gets compared.'],
    },
    tasks: [
      {
        kind: 'calc',
        asks: [
          { kind: 'mean', folds: FOLDS, config: LEXICAL },
          { kind: 'mean', folds: FOLDS, config: SEMANTIC },
        ],
      },
    ],
    example: [{ show: 'calc', ask: { kind: 'mean', folds: FOLDS } }],
  },
  {
    id: 'rag-cost',
    block: 8,
    tier: 'advanced',
    kind: 'unit',
    es: {
      title: 'Coste y beneficio',
      goal: 'Esta configuración acierta todo… reordenando 20 trozos y metiendo 10 en el prompt. Mantén las respuestas con mucha menos latencia.',
      theory: {
        what: 'Cada mejora cuesta algo: tiempo de indexado, latencia por consulta, tokens. Afinar es comprar aciertos al menor precio.',
        how: [
          'depth=20, k=10  # 1.00 a 251 ms',
          'depth=5,  k=5   # 1.00 a 128 ms',
          'puntos ganados / ms de más',
        ],
        when: 'Antes de dar un cambio por bueno: apunta la cifra y lo que cuesta.',
        whenNot: 'No recortes hasta perder respuestas: primero el objetivo, luego el precio.',
        problems:
          'Sumar técnicas porque «algo ayudarán». Si la cifra no se mueve y la latencia sí, sobra.',
      },
      example: 'Antes de verlo: pasas de reordenar 20 trozos a reordenar 5. ¿Bajarán los aciertos?',
      frames: [
        'Reordenar 20 y recuperar 10: todo acertado, y un cuarto de segundo por pregunta.',
        'Reordenar 5 y recuperar 5: los mismos aciertos en la mitad de tiempo.',
      ],
    },
    en: {
      title: 'Cost and benefit',
      goal: 'This configuration gets everything right… by reranking 20 chunks and putting 10 in the prompt. Keep the answers with far less latency.',
      theory: {
        what: 'Every improvement costs something: indexing time, latency per query, tokens. Tuning means buying hits at the lowest price.',
        how: [
          'depth=20, k=10  # 1.00 at 251 ms',
          'depth=5,  k=5   # 1.00 at 128 ms',
          'points gained / extra ms',
        ],
        when: 'Before calling a change good: note the figure and what it costs, both.',
        whenNot: 'Do not cut until you lose answers: the goal first, then the price.',
        problems:
          'Stacking techniques because "they must help". If the figure does not move and latency does, drop it.',
      },
      example:
        'Before you look: you go from reranking 20 chunks to reranking 5. Will hits go down?',
      frames: [
        'Reranking 20 and retrieving 10: everything right, and a quarter of a second per question.',
        'Reranking 5 and retrieving 5: the same hits in half the time.',
      ],
    },
    tasks: [
      {
        kind: 'tune',
        base: LAVISH,
        knobs: ['mode', 'rerank', 'depth', 'k'],
        questions: DEV_FOUND,
        objectives: [
          { metric: 'answers', op: '>=' },
          { metric: 'latency', op: '<=' },
        ],
        solution: [{}, { depth: 5, k: 5 }],
      },
    ],
    example: [
      {
        show: 'metrics',
        config: LAVISH,
        questions: DEV_FOUND,
        keys: ['answers', 'mrr', 'latency'],
      },
      {
        show: 'metrics',
        config: { ...LAVISH, depth: 5, k: 5 },
        questions: DEV_FOUND,
        keys: ['answers', 'mrr', 'latency'],
      },
    ],
  },
  {
    id: 'rag-boss-perfect',
    block: 8,
    tier: 'advanced',
    kind: 'boss',
    limit: 360,
    es: {
      title: 'El 100 % que no era',
      goal: 'Encuentra por qué el informe decía 100 %, deja una cifra de la que fiarse y un sistema que no cueste el doble.',
      story:
        'El informe trimestral dice «100 % de respuestas correctas». La primera clienta de la beta pregunta tres cosas y el bot falla dos. Alguien indexó el repositorio entero «para ir rápido» y lo afinó todo mirando siempre las mismas seis preguntas.',
      tasks: [
        'Comprueba con las preguntas apartadas, quita la fuga (y lo demás que no debe estar) y arregla el troceado.',
        'Calcula la media de recall@3 de la tubería en las tres particiones.',
        'Recorta el coste: las mismas respuestas con menos latencia.',
      ],
    },
    en: {
      title: 'The 100% that was not',
      goal: 'Find out why the report said 100%, leave a figure you can trust and a system that does not cost twice as much.',
      story:
        'The quarterly report says "100% correct answers". The first beta customer asks three things and the bot fails two. Someone indexed the whole repository "to move fast" and tuned everything while looking at the same six questions.',
      tasks: [
        'Check with the held-out questions, remove the leak (and whatever else should not be there) and fix the chunking.',
        'Work out the mean recall@3 of the pipeline over the three folds.',
        'Cut the cost: the same answers with less latency.',
      ],
    },
    tasks: [
      {
        kind: 'tune',
        base: { ...LEAKY, sources: ['docs', 'code', 'lock', 'env', 'eval'] },
        knobs: ['sources', 'chunker', 'size'],
        questions: TEST,
        dev: LEAKED,
        objectives: [
          { metric: 'match', op: '>=' },
          { metric: 'leaks', op: '<=' },
          { metric: 'secrets', op: '<=' },
        ],
        solution: [{ sources: ['docs', 'code'], chunker: 'structure', size: 60 }],
      },
      { kind: 'calc', asks: [{ kind: 'mean', folds: FOLDS }] },
      {
        kind: 'tune',
        base: LAVISH,
        knobs: ['rerank', 'depth', 'k'],
        questions: DEV_FOUND,
        objectives: [
          { metric: 'answers', op: '>=' },
          { metric: 'latency', op: '<=' },
        ],
        solution: [{ depth: 5, k: 5 }],
      },
    ],
  },

  /* ---------- Bloque 9: producción ---------- */
  {
    id: 'rag-incremental',
    block: 9,
    tier: 'advanced',
    kind: 'unit',
    es: {
      title: 'Indexado incremental',
      goal: 'Alguien cambia una guía y el índice se rehace entero. Haz que solo se recalcule lo que ha cambiado.',
      theory: {
        what: 'El indexado incremental guarda una huella de cada fichero y, al reindexar, solo recalcula los que han cambiado.',
        how: [
          'huella = sha256(contenido)',
          'if huella != manifiesto[ruta]:',
          '    reindexar(ruta)   # solo ese fichero',
          'borrar trozos de ficheros que ya no están',
        ],
        when: 'En cuanto calcular embeddings tarda: un commit de una línea no puede costar minutos.',
        whenNot: 'Si cambias el troceado o el modelo, toca rehacerlo entero.',
        problems:
          'Comparar por fecha y no por contenido: un checkout lo cambia todo y se recalcula todo.',
      },
      example:
        'Antes de verlo: cambia una guía de 13. Sin incremental, ¿cuántos trozos se recalculan al reindexar?',
      frames: [
        'Sin incremental: los 39 trozos, dos veces. El cambio de una línea cuesta como empezar de cero.',
        'Con incremental: la segunda vez solo se recalculan los 3 trozos de la guía cambiada.',
      ],
    },
    en: {
      title: 'Incremental indexing',
      goal: 'Someone changes one guide and the index is rebuilt from scratch. Make it recompute only what changed.',
      theory: {
        what: 'Incremental indexing keeps a fingerprint of each file and, when reindexing, only chunks and embeds the ones that changed.',
        how: [
          'fingerprint = sha256(content)',
          'if fingerprint != manifest[path]:',
          '    reindex(path)   # just that file',
          'drop chunks of files that are gone',
        ],
        when: 'As soon as computing embeddings takes a while: a one-line commit cannot cost minutes.',
        whenNot: 'If you change chunking or model, rebuild it all.',
        problems:
          'Comparing by date instead of content: a checkout changes everything and everything is recomputed.',
      },
      example:
        'Before you look: one guide out of 13 changes. Without incremental, how many chunks are recomputed on reindex?',
      frames: [
        'Without incremental: all 39 chunks, twice. A one-line change costs like starting over.',
        'With incremental: the second time only the 3 chunks of the changed guide are recomputed.',
      ],
    },
    tasks: [
      {
        kind: 'tune',
        knobs: ['incremental'],
        questions: ['retries', 'heartbeat'],
        workload: true,
        objectives: [{ metric: 'ops.embeddings', op: '<=' }],
        solution: [{}, { incremental: true }],
      },
    ],
    example: [{ show: 'ops' }, { show: 'ops', config: { incremental: true } }],
  },
  {
    id: 'rag-cache',
    block: 9,
    tier: 'advanced',
    kind: 'unit',
    es: {
      title: 'Caché de consultas',
      goal: 'La mitad de las preguntas se repiten. Ahorra su tiempo con una caché… sin servir ni una respuesta vieja después de reindexar.',
      theory: {
        what: 'La caché guarda la respuesta de cada pregunta ya contestada y la devuelve sin volver a buscar ni a generar.',
        how: [
          'clave = (normalizar(pregunta), k, version_indice)',
          'if clave in cache: return cache[clave]',
          'al reindexar: vaciar (o cambiar la versión)',
        ],
        when: 'Con preguntas repetidas y generación lenta: de 80 ms a 1.',
        whenNot: 'Si casi nada se repite, solo añade otra forma de dar respuestas viejas.',
        problems:
          'No invalidar: la guía pasa de 5 a 7 reintentos y la caché sigue diciendo 5: «Respuestas viejas».',
      },
      example:
        'Antes de verlo: la respuesta está en caché y luego cambia el documento. Sin invalidar, ¿qué recibe quien pregunta?',
      frames: [
        'Con caché y sin invalidar: rápido, pero tras el cambio sirve la respuesta de antes.',
        'Clave normalizada e invalidación al reindexar: más aciertos de caché y ninguna respuesta vieja.',
      ],
    },
    en: {
      title: 'Query cache',
      goal: 'Half the questions repeat. Save their time with a cache… without serving a single stale answer after reindexing.',
      theory: {
        what: 'The cache stores the answer to each question already answered and returns it without searching or generating again.',
        how: [
          'key = (normalize(question), k, index_version)',
          'if key in cache: return cache[key]',
          'on reindex: empty it (or bump the version)',
        ],
        when: 'With repeated questions and slow generation: from 80 ms to 1 ms.',
        whenNot: 'If hardly anything repeats, it only adds another way to give stale answers.',
        problems:
          'Not invalidating: the guide goes from 5 to 7 retries and the cache still says 5: "Stale answers".',
      },
      example:
        'Before you look: the answer is cached and then the document changes. Without invalidating, what does the asker get?',
      frames: [
        'Cache with no invalidation: fast, but after the change it serves the earlier answer.',
        'Normalized key and invalidation on reindex: more cache hits and no stale answer.',
      ],
    },
    tasks: [
      {
        kind: 'tune',
        base: { incremental: true },
        knobs: ['cache', 'cacheKey', 'invalidate'],
        questions: ['retries', 'heartbeat'],
        workload: true,
        objectives: [
          { metric: 'ops.latency', op: '<=' },
          { metric: 'ops.stale', op: '<=' },
        ],
        solution: [{}, { cache: true, cacheKey: 'normalized', invalidate: true }],
      },
    ],
    example: [
      { show: 'ops', config: { incremental: true, cache: true } },
      {
        show: 'ops',
        config: { incremental: true, cache: true, cacheKey: 'normalized', invalidate: true },
      },
    ],
  },
  {
    id: 'rag-api',
    block: 9,
    tier: 'advanced',
    kind: 'unit',
    es: {
      title: 'La API',
      goal: 'Pide a la API la respuesta a «How often does a worker send a heartbeat?» con 3 fuentes. Tiene que contestar 200, con la respuesta y sus fuentes.',
      theory: {
        what: 'La API pone tu RAG detrás de HTTP: una ruta para buscar, otra para responder y otra para saber si está vivo.',
        how: [
          'GET  /healthz           -> 200 {"status": "ok"}',
          'GET  /search?q=…&k=3    -> 200 {"sources": […]}',
          'POST /answer {query, k} -> 200 {"answer", "sources"}',
          'consulta vacía o k = 0  -> 422',
        ],
        when: 'Cuando lo vaya a usar otro programa.',
        whenNot: 'Para probar tú, la línea de órdenes basta.',
        problems:
          'Buscar antes de validar: un k = 1000 tumba el servicio. Aquí: «422 k_out_of_range».',
      },
      example: 'Antes de verlo: mandas GET a /answer, que solo admite POST. ¿Qué código devuelve?',
      frames: [
        'Método equivocado: 405, sin buscar nada.',
        'k = 0: 422, la petición no vale y no se trabaja.',
        'Bien pedida: 200, con la respuesta, la cita y las fuentes con ruta y líneas.',
      ],
    },
    en: {
      title: 'The API',
      goal: 'Ask the API for the answer to "How often does a worker send a heartbeat?" with 3 sources. It must reply 200, with the answer and its sources.',
      theory: {
        what: 'The API puts your RAG behind HTTP: one route to search, one to answer and one to tell whether it is alive.',
        how: [
          'GET  /healthz           -> 200 {"status": "ok"}',
          'GET  /search?q=…&k=3    -> 200 {"sources": […]}',
          'POST /answer {query, k} -> 200 {"answer", "sources"}',
          'empty query or k = 0    -> 422',
        ],
        when: 'When another program will use it.',
        whenNot: 'To try it yourself, the command line is enough.',
        problems:
          'Searching before validating: a k = 1000 takes the service down. Here: "422 k_out_of_range".',
      },
      example:
        'Before you look: you send GET to /answer, which only accepts POST. Which status comes back?',
      frames: [
        'Wrong method: 405, without searching anything.',
        'k = 0: 422, the request is invalid and no work is done.',
        'Asked properly: 200, with the answer, the citation and the sources with path and lines.',
      ],
    },
    tasks: [
      {
        kind: 'api',
        questions: ['retries', 'heartbeat', 'price'],
        solution: { method: 'POST', path: '/answer', q: 'heartbeat', k: 3 },
      },
    ],
    example: [
      { show: 'api', request: { method: 'GET', path: '/answer', q: 'heartbeat', k: 3 } },
      { show: 'api', request: { method: 'POST', path: '/answer', q: 'heartbeat', k: 0 } },
      { show: 'api', request: { method: 'POST', path: '/answer', q: 'heartbeat', k: 3 } },
    ],
  },
  {
    id: 'rag-failures',
    block: 9,
    tier: 'advanced',
    kind: 'unit',
    es: {
      title: 'Diagnóstico por etapas',
      goal: 'Cuatro preguntas fallan, cada una en un sitio distinto de la tubería. Di en qué etapa se pierde cada respuesta.',
      theory: {
        what: 'Una respuesta mala se pierde en una etapa concreta. Diagnosticar es seguir el trozo bueno hasta ver dónde desaparece.',
        how: [
          '¿entero en algún trozo?  no -> troceado',
          '¿entre los k?            no -> búsqueda',
          '¿en el prompt?           no -> prompt',
          '¿en la respuesta?        no -> generación',
        ],
        when: 'Ante cada fallo, antes de tocar ningún mando.',
        whenNot: 'Un fallo suelto no es tendencia: cuenta cuántos caen en cada etapa.',
        problems: 'Culpar al modelo: si el trozo no llegó al prompt, ningún modelo lo arregla.',
      },
      example:
        'Antes de verlo: el trozo bueno queda quinto y solo se recuperan 3. ¿En qué etapa se pierde la respuesta?',
      frames: [
        'El trozo bueno existe y está entero, pero queda quinto: se pierde en la búsqueda.',
        'Aquí la frase quedó partida entre dos trozos: se pierde antes, al trocear.',
      ],
    },
    en: {
      title: 'Stage-by-stage diagnosis',
      goal: 'Four questions fail, each at a different point of the pipeline. Say at which stage each answer is lost.',
      theory: {
        what: 'A bad answer is lost at one specific stage. Diagnosing means following the right chunk until it disappears.',
        how: [
          'whole inside some chunk?  no -> chunking',
          'among the k?              no -> search',
          'in the prompt?            no -> prompt',
          'in the answer?            no -> generation',
        ],
        when: 'On every failure, before touching any knob.',
        whenNot: 'One failure is not a trend: count how many fall at each stage.',
        problems: 'Blaming the model: if the chunk never reached the prompt, no model fixes it.',
      },
      example:
        'Before you look: the right chunk is fifth and only 3 are retrieved. At which stage is the answer lost?',
      frames: [
        'The right chunk exists and is whole, but it is fifth: it is lost in search.',
        'Here the sentence was split between two chunks: it is lost earlier, while chunking.',
      ],
    },
    tasks: [{ kind: 'pick', cases: LOST }],
    example: [
      { show: 'trace', question: 'shutdown', focus: 'fusion' },
      {
        show: 'trace',
        question: 'health',
        config: { ...LEXICAL, chunker: 'fixed', size: 30 },
        focus: 'chunks',
      },
    ],
  },
  {
    id: 'rag-boss-launch',
    block: 9,
    tier: 'advanced',
    kind: 'boss',
    limit: 360,
    es: {
      title: 'Día de lanzamiento',
      goal: 'Deja el servicio listo para tráfico de verdad: barato de mantener al día, rápido en lo repetido, con su API y con los fallos localizados.',
      story:
        'Mañana el bot se abre a todos los clientes. Hoy reindexar tarda lo mismo cambie una coma o todo, cada pregunta repetida se calcula entera, el equipo de la web no sabe cómo llamarlo y hay dos tiques de «responde mal» sin diagnosticar.',
      tasks: [
        'Operación: reindexar solo lo cambiado y cachear lo repetido, sin respuestas viejas.',
        'API: pide las 2 mejores fuentes para «Which port is the health endpoint on?», sin generar respuesta.',
        'Diagnóstico: di en qué etapa se pierde cada uno de los dos tiques.',
      ],
    },
    en: {
      title: 'Launch day',
      goal: 'Get the service ready for real traffic: cheap to keep current, fast on repeats, with its API and with failures located.',
      story:
        'Tomorrow the bot opens to every customer. Today reindexing takes the same whether a comma or everything changes, every repeated question is computed in full, the web team does not know how to call it and two "it answers wrong" tickets sit undiagnosed.',
      tasks: [
        'Operations: reindex only what changed and cache repeats, with no stale answers.',
        'API: ask for the 2 best sources for "Which port is the health endpoint on?", without generating an answer.',
        'Diagnosis: say at which stage each of the two tickets is lost.',
      ],
    },
    tasks: [
      {
        kind: 'tune',
        knobs: ['incremental', 'cache', 'cacheKey', 'invalidate'],
        questions: ['retries', 'heartbeat'],
        workload: true,
        objectives: [
          { metric: 'ops.embeddings', op: '<=' },
          { metric: 'ops.latency', op: '<=' },
          { metric: 'ops.stale', op: '<=' },
        ],
        solution: [{ incremental: true, cache: true, cacheKey: 'normalized', invalidate: true }],
      },
      {
        kind: 'api',
        questions: ['health', 'retries', 'windows'],
        solution: { method: 'GET', path: '/search', q: 'health', k: 2 },
      },
      {
        kind: 'pick',
        cases: [
          { of: 'stage', question: 'backoff', config: { ...LEXICAL, chunker: 'fixed', size: 20 } },
          { of: 'stage', question: 'shutdown', config: {} },
        ],
      },
    ],
  },
  {
    id: 'rag-final-advanced',
    block: 9,
    tier: 'advanced',
    kind: 'final',
    limit: 720,
    es: {
      title: 'RAG against the machine',
      goal: 'Entrega un RAG completo sobre el repositorio de Colmena: medido con preguntas que no has visto, sin fugas, con citas y dentro del tiempo.',
      story:
        'Es tu proyecto: indexar un repositorio y responder sobre él con fuentes. Quien lo evalúa trae su propio conjunto de preguntas, mirará la latencia y te pedirá que expliques un fallo en directo. Lo que hay es el prototipo de alguien que lo indexó todo, cortó cada 20 palabras y nunca midió.',
      tasks: [
        'La tubería entera: afina con las preguntas de desarrollo y comprueba con las apartadas. Sin fugas ni secretos, citando, sin inventar y sin pasarte de latencia.',
        'Explica dos fallos: en qué etapa se pierde cada respuesta.',
        'Déjalo en producción: incremental, con caché y sin respuestas viejas.',
      ],
    },
    en: {
      title: 'RAG against the machine',
      goal: 'Deliver a complete RAG over the Colmena repository: measured on questions you have not seen, with no leaks, with citations and on time.',
      story:
        'It is your project: index a repository and answer about it with sources. Whoever evaluates it brings their own set of questions, will check latency and will ask you to explain a failure live. What exists is the prototype of someone who indexed everything, cut every 20 words and never measured.',
      tasks: [
        'The whole pipeline: tune on the development questions and check on the held-out ones. No leaks or secrets, citing, inventing nothing and within latency.',
        'Explain two failures: at which stage each answer is lost.',
        'Leave it in production: incremental, cached and with no stale answers.',
      ],
    },
    tasks: [
      {
        kind: 'tune',
        base: {
          ...LEXICAL,
          sources: ['docs', 'code', 'lock', 'env', 'eval'],
          chunker: 'fixed',
          size: 20,
          k: 8,
          budget: 120,
          order: 'worst',
          strict: false,
          labels: false,
          minSupport: 1,
        },
        knobs: [
          'sources',
          'chunker',
          'size',
          'mode',
          'rerank',
          'depth',
          'k',
          'budget',
          'order',
          'strict',
          'labels',
          'minSupport',
        ],
        questions: TEST,
        dev: [...DEV_FOUND, 'price', 'windows'],
        objectives: [
          { metric: 'cited', op: '>=' },
          { metric: 'abstain', op: '>=' },
          { metric: 'invented', op: '<=' },
          { metric: 'leaks', op: '<=' },
          { metric: 'secrets', op: '<=' },
          { metric: 'latency', op: '<=' },
        ],
        solution: [
          {
            sources: ['docs', 'code'],
            chunker: 'structure',
            size: 60,
            mode: 'hybrid',
            rerank: true,
            depth: 5,
            k: 3,
            budget: 300,
            order: 'best',
            strict: true,
            labels: true,
            minSupport: 3,
          },
        ],
      },
      {
        kind: 'pick',
        cases: [
          { of: 'stage', question: 'deadworker', config: LEXICAL },
          { of: 'stage', question: 'memory', config: { k: 5, budget: 70, order: 'worst' } },
        ],
      },
      {
        kind: 'tune',
        knobs: ['incremental', 'cache', 'cacheKey', 'invalidate'],
        questions: ['retries', 'heartbeat'],
        workload: true,
        objectives: [
          { metric: 'ops.embeddings', op: '<=' },
          { metric: 'ops.latency', op: '<=' },
          { metric: 'ops.stale', op: '<=' },
        ],
        solution: [{ incremental: true, cache: true, cacheKey: 'normalized', invalidate: true }],
      },
    ],
  },
]
