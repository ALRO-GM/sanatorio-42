/**
 * Nivel intermedio: del buscador a la respuesta. Bloques 4 a 6 y su jefe
 * final: juntar la búsqueda léxica y la semántica (RRF, pesos, reordenado),
 * montar el prompt (presupuesto, orden) y generar con fundamento (citas, «no
 * lo sé», contexto de relleno).
 */

import { DEV, DEV_FOUND, TEST } from './sets.js'
import type { Setup, UnitDef } from './types.js'

const LEXICAL: Setup = { mode: 'lexical' }

/** Un prompt apretado, lleno al revés: lo que había antes de que alguien lo mirase. */
const TIGHT: Setup = { k: 5, budget: 120, order: 'worst' }

/** Un bot que contesta siempre, sin citar y con el listón por los suelos. */
const CARELESS: Setup = { strict: false, labels: false, minSupport: 1 }

export const INTERMEDIATE: UnitDef[] = [
  /* ---------- Bloque 4: híbrido y reordenado ---------- */
  {
    id: 'rag-hybrid',
    block: 4,
    tier: 'intermediate',
    kind: 'unit',
    es: {
      title: 'Búsqueda híbrida',
      goal: 'Ni la búsqueda léxica ni la semántica aciertan todas. Mide las dos y encuentra el modo que acierta más entre los 3 primeros.',
      theory: {
        what: 'La búsqueda híbrida lanza la léxica y la semántica y junta sus listas. Cada una acierta donde la otra falla.',
        how: [
          'lex = bm25(pregunta, 20)      # nombres exactos',
          'sem = coseno(pregunta, 20)    # otras palabras',
          'top = fusionar(lex, sem)[:k]  # lo mejor de las dos',
        ],
        when: 'En cuanto tu corpus mezcla código e identificadores con preguntas de personas. Es casi siempre.',
        whenNot:
          'Sin tiempo para calcular embeddings, BM25 solo es un punto de partida digno y rápido.',
        problems:
          'Elegir un buscador por dos ejemplos. La léxica falla «run twice» y la semántica falla «--legacy»: con cualquiera pierdes preguntas. Mide las tres opciones.',
      },
      example:
        'Antes de verlo: preguntan por «--legacy», que no es ningún concepto. ¿Cuál de los dos buscadores lo encuentra?',
      frames: [
        'Semántica: «--legacy» no significa nada para el modelo y la lista sale vacía.',
        'Léxica: la palabra exacta está en un solo trozo y sale el primero.',
        'Híbrida: se queda con el acierto de la que lo tenga.',
      ],
    },
    en: {
      title: 'Hybrid search',
      goal: 'Neither lexical nor semantic search gets them all. Measure both and find the mode that hits most in the top 3.',
      theory: {
        what: 'Hybrid search runs lexical and semantic search and merges their lists. Each one hits where the other misses.',
        how: [
          'lex = bm25(question, 20)      # exact names',
          'sem = cosine(question, 20)    # other words',
          'top = fuse(lex, sem)[:k]      # the best of both',
        ],
        when: 'As soon as your corpus mixes code and identifiers with questions from people. That is nearly always.',
        whenNot: 'With no time to compute embeddings, BM25 alone is a decent, fast starting point.',
        problems:
          'Picking a searcher from two examples. Lexical misses "run twice" and semantic misses "--legacy": either one loses questions. Measure all three options.',
      },
      example:
        'Before you look: someone asks about "--legacy", which is no concept at all. Which of the two searchers finds it?',
      frames: [
        'Semantic: "--legacy" means nothing to the model and the list comes back empty.',
        'Lexical: the exact word is in a single chunk and it comes first.',
        'Hybrid: it keeps the hit from whichever one has it.',
      ],
    },
    tasks: [
      {
        kind: 'tune',
        base: LEXICAL,
        knobs: ['mode'],
        questions: DEV_FOUND,
        objectives: [{ metric: 'recall@3', op: '>=' }],
        solution: [{}, { mode: 'semantic' }, { mode: 'hybrid' }],
      },
    ],
    example: [
      { show: 'trace', question: 'legacy', config: { mode: 'semantic' }, focus: 'semantic' },
      { show: 'trace', question: 'legacy', config: LEXICAL, focus: 'lexical' },
      { show: 'trace', question: 'legacy', focus: 'fusion' },
    ],
  },
  {
    id: 'rag-rrf',
    block: 4,
    tier: 'intermediate',
    kind: 'unit',
    es: {
      title: 'Fusión por rangos (RRF)',
      goal: 'Calcula a mano la puntuación RRF de un trozo y luego ordena los cuatro primeros como los deja la fusión.',
      theory: {
        what: 'RRF junta dos listas mirando solo los puestos: cada trozo suma 1/(k + puesto) por cada lista en la que está.',
        how: [
          'rrf(d) = 1/(60 + puesto_lex) + 1/(60 + puesto_sem)',
          '1º y 3º  -> 1/61 + 1/63 = 0.0323',
          'solo 1º  -> 1/61        = 0.0164',
        ],
        when: 'Para fusionar listas con puntuaciones que no se pueden comparar, como BM25 y coseno.',
        whenNot: 'Si las dos listas vienen del mismo buscador, sumar sus puntuaciones ya vale.',
        problems:
          'Sumar BM25 (0 a 20) y coseno (0 a 1): la léxica lo decide todo. Se nota en que la lista fusionada es la léxica. Usa los puestos.',
      },
      example:
        'Antes de verlo: un trozo es 3º en una lista y 1º en la otra; otro es 1º en una sola. ¿Cuál queda delante?',
      frames: [
        'Las puntuaciones no se miran: solo el puesto de cada trozo en cada lista.',
        'Estar en las dos listas pesa más que encabezar una sola.',
      ],
    },
    en: {
      title: 'Rank fusion (RRF)',
      goal: 'Work out the RRF score of one chunk by hand, then order the top four the way fusion leaves them.',
      theory: {
        what: 'RRF merges two lists looking only at ranks: each chunk adds 1/(k + rank) for every list it is in.',
        how: [
          'rrf(d) = 1/(60 + lex_rank) + 1/(60 + sem_rank)',
          '1st and 3rd -> 1/61 + 1/63 = 0.0323',
          '1st only    -> 1/61        = 0.0164',
        ],
        when: 'To fuse lists whose scores cannot be compared, such as BM25 and cosine.',
        whenNot: 'If both lists come from the same searcher, adding their scores is already fine.',
        problems:
          'Adding BM25 (0 to 20) and cosine (0 to 1): lexical decides everything. You notice because the fused list is the lexical one. Use ranks.',
      },
      example:
        'Before you look: one chunk is 3rd in one list and 1st in the other; another is 1st in just one. Which ends up ahead?',
      frames: [
        'Scores are not looked at: only the rank of each chunk in each list.',
        'Being in both lists weighs more than topping just one.',
      ],
    },
    tasks: [
      { kind: 'calc', asks: [{ kind: 'rrf', question: 'dead', chunk: 'docs/reintentos.md#3' }] },
      { kind: 'order', question: 'dead', show: 4 },
    ],
    example: [
      { show: 'calc', ask: { kind: 'rrf', question: 'parallel', chunk: 'docs/workers.md#1' } },
      { show: 'trace', question: 'parallel', focus: 'fusion' },
    ],
  },
  {
    id: 'rag-weights',
    block: 4,
    tier: 'intermediate',
    kind: 'unit',
    es: {
      title: 'Pesos del híbrido',
      goal: 'En este corpus la semántica acierta más que la léxica. Ajusta el peso y la k de RRF para que todas las respuestas entren entre los 3 primeros y suban de puesto.',
      theory: {
        what: 'El peso reparte cuánto cuenta cada lista: 0 es solo léxica y 1, solo semántica. La k de RRF dice cuánto valen los primeros puestos.',
        how: [
          'peso = 0.5   # las dos listas igual',
          'peso = 0.7   # manda la semántica',
          'k = 60       # puestos casi iguales',
          'k = 1        # el 1º vale el doble que el 2º',
        ],
        when: 'Cuando midas que un buscador acierta más que el otro.',
        whenNot: 'No lo lleves a 0 ni a 1: eso ya no es híbrido.',
        problems:
          'Tocar el peso mirando una sola pregunta: mejora esa y empeora dos. Mira el MRR del conjunto.',
      },
      example:
        'Antes de verlo: subes el peso de la semántica a 0,7. La pregunta con otras palabras, ¿subirá o bajará de puesto?',
      frames: [
        'A medias (0,5), el trozo bueno queda quinto: la léxica mete delante otros cuatro.',
        'Con peso 0,7 manda la semántica y el trozo bueno sube al primer puesto.',
      ],
    },
    en: {
      title: 'Hybrid weights',
      goal: 'In this corpus semantic search hits more than lexical. Tune the weight and the RRF k so every answer makes the top 3 and moves up.',
      theory: {
        what: 'The weight splits how much each list counts: 0 is lexical only and 1, semantic only. The RRF k says how much the top places are worth.',
        how: [
          'weight = 0.5   # both lists the same',
          'weight = 0.7   # semantic leads',
          'k = 60         # places nearly equal',
          'k = 1          # 1st is worth twice the 2nd',
        ],
        when: 'When you measure that one searcher hits more than the other.',
        whenNot: 'Do not push it to 0 or 1: that is no longer hybrid.',
        problems:
          'Tuning on one question: it improves that one and worsens two. Check the set MRR.',
      },
      example:
        'Before you look: you raise the semantic weight to 0.7. Will the question in other words move up or down?',
      frames: [
        'Half and half (0.5), the right chunk is fifth: lexical puts four others ahead.',
        'With weight 0.7 semantic leads and the right chunk moves up to first place.',
      ],
    },
    tasks: [
      {
        kind: 'tune',
        knobs: ['weight', 'rrfK'],
        questions: DEV_FOUND,
        objectives: [
          { metric: 'recall@3', op: '>=' },
          { metric: 'mrr', op: '>=' },
        ],
        solution: [{}, { weight: 0.7 }],
      },
    ],
    example: [
      { show: 'trace', question: 'shutdown', focus: 'fusion' },
      { show: 'trace', question: 'shutdown', config: { weight: 0.7 }, focus: 'fusion' },
    ],
  },
  {
    id: 'rag-rerank',
    block: 4,
    tier: 'intermediate',
    kind: 'unit',
    es: {
      title: 'Reordenado',
      goal: 'Pon el trozo bueno el primero en todas las preguntas reordenando solo los candidatos que haga falta: cada uno cuesta tiempo.',
      theory: {
        what: 'El reordenado vuelve a puntuar los primeros candidatos con un modelo más lento que lee pregunta y trozo juntos, y los recoloca.',
        how: [
          'candidatos = hibrido(pregunta, 20)',
          'mejores = reordenar(pregunta, candidatos[:5])',
          'top = mejores[:k]   # 5 lecturas de más',
        ],
        when: 'Cuando el trozo bueno suele estar entre los primeros pero no el primero: sube el MRR sin tocar el índice.',
        whenNot:
          'Si la latencia manda, o si el bueno ni siquiera llega a los candidatos: reordenar no encuentra, solo recoloca.',
        problems:
          'Reordenar 20 por si acaso: la latencia se triplica sin mejorar. Compara «Latencia» con el MRR y quédate con la profundidad mínima.',
      },
      example:
        'Antes de verlo: el trozo bueno es tercero y un lector más lento vuelve a puntuar los 5 primeros. ¿Dónde acabará?',
      frames: [
        'Sin reordenar, el trozo bueno queda tercero, detrás de dos que solo se le parecen.',
        'Reordenando 5, el lector lo lee junto a la pregunta y lo pone el primero.',
      ],
    },
    en: {
      title: 'Reranking',
      goal: 'Put the right chunk first for every question while reranking only as many candidates as needed: each one costs time.',
      theory: {
        what: 'Reranking scores the top candidates again with a slower model that reads question and chunk together, and rearranges them.',
        how: [
          'candidates = hybrid(question, 20)',
          'best = rerank(question, candidates[:5])',
          'top = best[:k]   # 5 extra reads',
        ],
        when: 'When the right chunk is usually near the top but not first: it raises MRR without touching the index.',
        whenNot:
          'If latency rules, or if the right chunk never reaches the candidates: reranking does not find, it only rearranges.',
        problems:
          'Reranking 20 just in case: latency triples with no gain. Compare "Latency" with MRR and keep the minimum depth.',
      },
      example:
        'Before you look: the right chunk is third and a slower reader scores the top 5 again. Where will it end up?',
      frames: [
        'Without reranking, the right chunk is third, behind two that only look like it.',
        'Reranking 5, the reader reads it next to the question and puts it first.',
      ],
    },
    tasks: [
      {
        kind: 'tune',
        knobs: ['rerank', 'depth'],
        questions: DEV_FOUND,
        objectives: [
          { metric: 'mrr', op: '>=' },
          { metric: 'latency', op: '<=' },
        ],
        solution: [{}, { rerank: true, depth: 5 }],
      },
    ],
    example: [
      { show: 'trace', question: 'backoff', focus: 'fusion' },
      { show: 'trace', question: 'backoff', config: { rerank: true, depth: 5 }, focus: 'rerank' },
    ],
  },
  {
    id: 'rag-boss-lists',
    block: 4,
    tier: 'intermediate',
    kind: 'boss',
    limit: 300,
    es: {
      title: 'Dos buscadores, una sola lista',
      goal: 'Deja un único recuperador que acierte nombres exactos y preguntas con otras palabras, con el bueno arriba y sin pasarse de latencia.',
      story:
        'El equipo lleva una semana discutiendo en un hilo: backend quiere BM25 «porque encuentra las funciones», producto quiere embeddings «porque entiende a la gente». Tu jefa cierra el hilo: «una sola lista, medida, antes de comer».',
      tasks: [
        'Demuestra con una cuenta por qué gana quien está en las dos listas: la puntuación RRF de un trozo.',
        'Configura el recuperador: el trozo bueno, el primero en todas, con la menor latencia que lo consiga.',
      ],
    },
    en: {
      title: 'Two searchers, one list',
      goal: 'Leave a single retriever that hits exact names and questions in other words, with the right chunk on top and within latency.',
      story:
        'The team has argued in a thread for a week: backend wants BM25 "because it finds the functions", product wants embeddings "because it understands people". Your manager closes the thread: "one list, measured, before lunch".',
      tasks: [
        'Show with a sum why whoever is in both lists wins: the RRF score of one chunk.',
        'Set up the retriever: the right chunk first for all of them, with the lowest latency that gets there.',
      ],
    },
    tasks: [
      { kind: 'calc', asks: [{ kind: 'rrf', question: 'heartbeat', chunk: 'docs/deploy.md#2' }] },
      {
        kind: 'tune',
        base: { ...LEXICAL, rerank: true, depth: 20 },
        knobs: ['mode', 'weight', 'rerank', 'depth'],
        questions: DEV_FOUND,
        objectives: [
          { metric: 'mrr', op: '>=' },
          { metric: 'latency', op: '<=' },
        ],
        solution: [{ mode: 'hybrid', weight: 0.5, rerank: true, depth: 5 }],
      },
    ],
  },

  /* ---------- Bloque 5: el prompt ---------- */
  {
    id: 'rag-budget',
    block: 5,
    tier: 'intermediate',
    kind: 'unit',
    es: {
      title: 'Presupuesto de tokens',
      goal: 'Con 80 tokens casi nada cabe en el prompt. Ajusta k y el presupuesto para que el trozo bueno entre siempre, gastando lo justo.',
      theory: {
        what: 'El prompt lleva instrucciones, trozos y pregunta. El presupuesto es cuántos tokens dejas gastar: lo que no cabe, no se lee.',
        how: [
          'usado = tokens(instrucciones) + tokens(pregunta)',
          'por cada trozo, del mejor al peor:',
          '    si usado + tokens(trozo) > presupuesto: parar',
          '    añadir trozo; usado += tokens(trozo)',
        ],
        when: 'Siempre: un modelo pequeño tiene poca ventana.',
        whenNot: 'No lo llenes porque quepa: más contexto es más latencia.',
        problems:
          'Presupuesto corto con k alto: recuperas 5 y entra 1. El banco lo enseña como «Se pierde en el prompt». Sube el presupuesto o baja el tamaño del trozo.',
      },
      example:
        'Antes de verlo: instrucciones y pregunta gastan unos 30 tokens y cada trozo unos 25. ¿Cuántos trozos caben en 80?',
      frames: [
        'Con 80 tokens entra un trozo; los otros dos se quedan fuera, y con ellos la respuesta.',
        'Con 150, los tres recuperados caben y el bueno llega al modelo.',
      ],
    },
    en: {
      title: 'Token budget',
      goal: 'With 80 tokens hardly anything fits the prompt. Tune k and the budget so the right chunk always gets in, spending just enough.',
      theory: {
        what: 'The prompt holds instructions, chunks and the question. The budget is how many tokens you allow: what does not fit is not read.',
        how: [
          'used = tokens(instructions) + tokens(question)',
          'for each chunk, best to worst:',
          '    if used + tokens(chunk) > budget: stop',
          '    add chunk; used += tokens(chunk)',
        ],
        when: 'Always: a small model has a short window.',
        whenNot: 'Do not fill it because it fits: more context means more latency.',
        problems:
          'Short budget with a high k: you retrieve 5 and 1 gets in. The bench shows it as "Lost in the prompt". Raise the budget or lower the chunk size.',
      },
      example:
        'Before you look: instructions and question take about 30 tokens and each chunk about 25. How many chunks fit in 80?',
      frames: [
        'With 80 tokens one chunk gets in; the other two stay out, and the answer with them.',
        'With 150, all three retrieved chunks fit and the right one reaches the model.',
      ],
    },
    tasks: [
      {
        kind: 'tune',
        base: { budget: 80 },
        knobs: ['k', 'budget'],
        questions: DEV_FOUND,
        objectives: [
          { metric: 'context', op: '>=' },
          { metric: 'tokens', op: '<=' },
        ],
        solution: [{}, { k: 5, budget: 150 }],
      },
    ],
    example: [
      { show: 'trace', question: 'twice', config: { budget: 80 }, focus: 'prompt' },
      { show: 'trace', question: 'twice', config: { budget: 150 }, focus: 'prompt' },
    ],
  },
  {
    id: 'rag-fits',
    block: 5,
    tier: 'intermediate',
    kind: 'unit',
    es: {
      title: 'Contar lo que cabe',
      goal: 'Haz la cuenta del montador a mano: cuántos trozos entran en el prompt con dos presupuestos distintos.',
      theory: {
        what: 'Montar el prompt es una suma: lo fijo más cada trozo, en orden, mientras no pase del presupuesto. El primero que no cabe corta.',
        how: [
          'fijo = 20 + tokens(pregunta)',
          'fijo + t1 <= presupuesto      # entra el 1º',
          'fijo + t1 + t2 <= presupuesto # entra el 2º',
          'el 3º se pasa -> fuera él y los de detrás',
        ],
        when: 'Para elegir tamaño de trozo y k con números.',
        whenNot: 'En producción cuenta con el tokenizador de tu modelo, no palabras.',
        problems:
          'Olvidar lo fijo y la etiqueta de cada fuente: el último trozo se queda fuera por 2 tokens.',
      },
      example:
        'Antes de verlo: el tercer trozo es una clase entera de Python y no cabe. ¿Entrarán los dos pequeños que vienen detrás?',
      frames: ['La suma, trozo a trozo: se para en el primero que haría pasar del presupuesto.'],
    },
    en: {
      title: 'Counting what fits',
      goal: 'Do the builder sum by hand: how many chunks get into the prompt under two different budgets.',
      theory: {
        what: 'Building the prompt is a sum: the fixed part plus each chunk, in order, while it stays within budget. The first one that does not fit cuts.',
        how: [
          'fixed = 20 + tokens(question)',
          'fixed + t1 <= budget        # 1st gets in',
          'fixed + t1 + t2 <= budget   # 2nd gets in',
          '3rd goes over -> it and the rest stay out',
        ],
        when: 'To choose chunk size and k with numbers.',
        whenNot: 'In production count with your model tokenizer, not words.',
        problems:
          'Forgetting the fixed part and each source label: the last chunk stays out by 2 tokens.',
      },
      example:
        'Before you look: the third chunk is a whole Python class and does not fit. Will the two small ones behind it get in?',
      frames: ['The sum, chunk by chunk: it stops at the first one that would go over budget.'],
    },
    tasks: [
      {
        kind: 'calc',
        asks: [
          { kind: 'fits', question: 'retries', config: { k: 5, budget: 100 } },
          { kind: 'fits', question: 'shutdown', config: { k: 5, budget: 140 } },
        ],
      },
    ],
    example: [
      { show: 'calc', ask: { kind: 'fits', question: 'heartbeat', config: { k: 5, budget: 120 } } },
    ],
  },
  {
    id: 'rag-order',
    block: 5,
    tier: 'intermediate',
    kind: 'unit',
    es: {
      title: 'El orden en el prompt',
      goal: 'Alguien llenó el prompt del peor trozo al mejor y el presupuesto corta justo los buenos. Cambia el orden para recuperar las respuestas.',
      theory: {
        what: 'El orden decide qué se queda fuera cuando el presupuesto corta. Del mejor al peor, se pierde lo que menos importaba.',
        how: [
          'orden = "mejor primero"  # corta por la cola',
          'orden = "peor primero"   # corta lo mejor',
          'orden = "por fichero"    # corta al azar',
        ],
        when: 'Siempre que haya presupuesto: llena por puntuación.',
        whenNot:
          'Poner el mejor junto a la pregunta vale después de elegir qué entra, no para llenar.',
        problems:
          'Invertir la lista antes de aplicar el presupuesto: el mejor es el primero en caerse. Verás «Se pierde en el prompt».',
      },
      example:
        'Antes de verlo: 5 trozos, caben 3 y entran del peor al mejor. ¿Cuáles se quedan fuera?',
      frames: [
        'Del peor al mejor: entran los tres peores y el presupuesto deja fuera los dos mejores.',
        'Del mejor al peor: lo que se queda fuera es lo que menos aportaba.',
      ],
    },
    en: {
      title: 'Order in the prompt',
      goal: 'Someone filled the prompt from worst chunk to best, and the budget cuts exactly the good ones. Change the order to get the answers back.',
      theory: {
        what: 'Order decides what stays out when the budget cuts. Best to worst, you lose what mattered least.',
        how: [
          'order = "best first"   # cuts from the tail',
          'order = "worst first"  # cuts the best',
          'order = "by file"      # cuts at random',
        ],
        when: 'Whenever there is a budget: fill by score.',
        whenNot:
          'Putting the best next to the question is fine after choosing what goes in, not for filling.',
        problems:
          'Reversing the list before applying the budget: the best is the first to fall out. You will see "Lost in the prompt".',
      },
      example:
        'Before you look: 5 chunks, 3 fit and they go in worst to best. Which ones stay out?',
      frames: [
        'Worst to best: the three worst get in and the budget leaves the two best out.',
        'Best to worst: what stays out is what added least.',
      ],
    },
    tasks: [
      {
        kind: 'tune',
        base: TIGHT,
        knobs: ['order'],
        questions: DEV_FOUND,
        objectives: [{ metric: 'answers', op: '>=' }],
        solution: [{}, { order: 'best' }],
      },
    ],
    example: [
      { show: 'trace', question: 'retries', config: TIGHT, focus: 'prompt' },
      { show: 'trace', question: 'retries', config: { ...TIGHT, order: 'best' }, focus: 'prompt' },
    ],
  },
  {
    id: 'rag-boss-budget',
    block: 5,
    tier: 'intermediate',
    kind: 'boss',
    limit: 300,
    es: {
      title: 'El contexto no cabe',
      goal: 'Deja el prompt del bot dentro de la ventana del modelo pequeño sin perder el trozo que responde.',
      story:
        'Para ahorrar, el equipo ha cambiado a un modelo local diminuto. Desde entonces el bot contesta «no lo sé» a la mitad: el prompt se montó para una ventana cuatro veces mayor, con 8 trozos metidos del peor al mejor.',
      tasks: [
        'Haz la cuenta: cuántos de los 5 trozos recuperados caben con 110 tokens.',
        'Ajusta k, presupuesto y orden: el trozo bueno siempre dentro, gastando lo justo.',
      ],
    },
    en: {
      title: 'The context does not fit',
      goal: 'Get the bot prompt inside the small model window without losing the chunk that answers.',
      story:
        'To save money, the team switched to a tiny local model. Since then the bot says "I do not know" half the time: the prompt was built for a window four times larger, with 8 chunks stuffed in from worst to best.',
      tasks: [
        'Do the sum: how many of the 5 retrieved chunks fit in 110 tokens.',
        'Tune k, budget and order: the right chunk always in, spending just enough.',
      ],
    },
    tasks: [
      { kind: 'calc', asks: [{ kind: 'fits', question: 'full', config: { k: 5, budget: 110 } }] },
      {
        kind: 'tune',
        base: { k: 8, budget: 100, order: 'worst' },
        knobs: ['k', 'budget', 'order'],
        questions: DEV_FOUND,
        objectives: [
          { metric: 'context', op: '>=' },
          { metric: 'tokens', op: '<=' },
        ],
        solution: [{ k: 5, budget: 150, order: 'best' }],
      },
    ],
  },

  /* ---------- Bloque 6: generación con fundamento ---------- */
  {
    id: 'rag-grounded',
    block: 6,
    tier: 'intermediate',
    kind: 'unit',
    es: {
      title: 'Fundamento y citas',
      goal: 'Cuando la búsqueda falla, este bot rellena de memoria, y cuando acierta no dice de dónde lo saca. Haz que no invente nada y que cite sus fuentes.',
      theory: {
        what: 'Generar con fundamento es exigir que responda solo con el contexto y diga de qué fuente sale. Para citar, las fuentes van numeradas.',
        how: [
          '"Responde solo con las fuentes."',
          '"Cita así: [n]. Si no está, di: No lo sé."',
          '[1] docs/reintentos.md:3-5',
          'Por defecto cada tarea se reintenta 5 veces. [1]',
        ],
        when: 'Siempre que alguien vaya a fiarse de la respuesta.',
        whenNot: 'Una cita no prueba nada si nadie abre la fuente: mídelo.',
        problems:
          'Dejar que complete «con lo que sepa»: si la búsqueda falla, sale un dato viejo sin cita. El banco cuenta «Inventadas».',
      },
      example:
        'Antes de verlo: la búsqueda no encuentra nada útil y el modelo puede completar por su cuenta. ¿Qué responderá?',
      frames: [
        'Sin exigir fundamento: como el contexto no ayuda, tira de memoria y no cita nada.',
        'Exigiéndolo y numerando las fuentes: o responde con su cita o reconoce que no lo sabe.',
      ],
    },
    en: {
      title: 'Grounding and citations',
      goal: 'When search fails, this bot fills in from memory, and when it hits it does not say where from. Make it invent nothing and cite its sources.',
      theory: {
        what: 'Grounded generation means demanding that it answers only from the context and says which source it comes from. To cite, sources are numbered.',
        how: [
          '"Answer only from the sources."',
          '"Cite like this: [n]. If absent: I do not know."',
          '[1] docs/reintentos.md:3-5',
          'Por defecto cada tarea se reintenta 5 veces. [1]',
        ],
        when: 'Whenever someone will trust the answer.',
        whenNot: 'A citation proves nothing if nobody opens the source: measure it.',
        problems:
          'Letting it fill in "with what it knows": if search fails, out comes a stale fact with no citation. The bench counts "Made up".',
      },
      example:
        'Before you look: search finds nothing useful and the model may fill in on its own. What will it answer?',
      frames: [
        'Without demanding grounding: the context does not help, so it uses memory and cites nothing.',
        'Demanding it and numbering sources: it either answers with its citation or admits it does not know.',
      ],
    },
    tasks: [
      {
        kind: 'tune',
        base: { ...LEXICAL, strict: false, labels: false, minSupport: 4 },
        knobs: ['strict', 'labels'],
        questions: DEV,
        objectives: [
          { metric: 'invented', op: '<=' },
          { metric: 'cited', op: '>=' },
        ],
        solution: [{}, { strict: true, labels: true }],
      },
    ],
    example: [
      {
        show: 'trace',
        question: 'backoff',
        config: { ...LEXICAL, strict: false, labels: false, minSupport: 4 },
        focus: 'answer',
      },
      {
        show: 'trace',
        question: 'backoff',
        config: { ...LEXICAL, minSupport: 4 },
        focus: 'answer',
      },
    ],
  },
  {
    id: 'rag-idk',
    block: 6,
    tier: 'intermediate',
    kind: 'unit',
    es: {
      title: 'Saber decir «no lo sé»',
      goal: 'Dos de estas preguntas no tienen respuesta en la documentación. Sube el listón hasta que el bot lo reconozca, sin que deje de responder las demás.',
      theory: {
        what: 'El respaldo mínimo es cuánto tiene que apoyar el contexto a una respuesta para darla. Por debajo, el bot dice «no lo sé» en vez de contestar lo que más se parezca.',
        how: [
          'mejor = frase_que_mas_respalda(contexto)',
          'si respaldo(mejor) < minimo:',
          '    responder("No lo sé")',
          'si no: responder(mejor, cita)',
        ],
        when: 'En cualquier bot que atienda a gente: una respuesta falsa cuesta más que un «no lo sé».',
        whenNot: 'Un listón muy alto calla respuestas buenas.',
        problems:
          'Listón a 1: siempre hay algún trozo que comparte una palabra. A «¿Cuánto cuesta la licencia?» contesta una frase de instalación, con cita. Súbelo midiendo.',
      },
      example:
        'Antes de verlo: preguntan cuánto cuesta la licencia y ningún documento habla de precios. Con el listón a 1, ¿qué hará el bot?',
      frames: [
        'Listón a 1: contesta con la frase que más se parece, que no tiene nada que ver.',
        'Listón a 3: ninguna frase llega, y reconoce que no lo sabe.',
      ],
    },
    en: {
      title: 'Knowing how to say "I do not know"',
      goal: 'Two of these questions have no answer in the documentation. Raise the bar until the bot admits it, without it going quiet on the rest.',
      theory: {
        what: 'Minimum support is how much the context must back an answer for it to be given. Below it, the bot says "I do not know" instead of the closest-looking thing.',
        how: [
          'best = most_supported_sentence(context)',
          'if support(best) < minimum:',
          '    answer("I do not know")',
          'else: answer(best, citation)',
        ],
        when: 'In any bot that serves people: a false answer with a citation costs more than an "I do not know".',
        whenNot: 'A very high bar silences good answers.',
        problems:
          'Bar at 1: some chunk always shares a word. To "How much is the licence?" it answers an install sentence, with a citation. Raise it while measuring.',
      },
      example:
        'Before you look: someone asks what the licence costs and no document mentions prices. With the bar at 1, what will the bot do?',
      frames: [
        'Bar at 1: it answers with the closest-looking sentence, which is unrelated.',
        'Bar at 3: no sentence reaches it, and it admits it does not know.',
      ],
    },
    tasks: [
      {
        kind: 'tune',
        base: { minSupport: 1 },
        knobs: ['minSupport'],
        questions: DEV,
        objectives: [
          { metric: 'abstain', op: '>=' },
          { metric: 'answers', op: '>=' },
        ],
        solution: [{}, { minSupport: 3 }],
      },
    ],
    example: [
      { show: 'trace', question: 'price', config: { minSupport: 1 }, focus: 'answer' },
      { show: 'trace', question: 'price', focus: 'answer' },
    ],
  },
  {
    id: 'rag-filler',
    block: 6,
    tier: 'intermediate',
    kind: 'unit',
    es: {
      title: 'Contexto de relleno',
      goal: 'Este prompt lleva 10 trozos «para que no falte nada». Deja solo los que hacen falta: todas las respuestas bien y más trozos útiles por cada uno recuperado.',
      theory: {
        what: 'El relleno son los trozos que entran en el prompt sin tener la respuesta: gastan presupuesto y dan al modelo frases parecidas con las que confundirse.',
        how: [
          'k = 10  # 1 trozo bueno y 9 de relleno',
          'k = 5   # el bueno y poco más',
          'precision = buenos / recuperados',
        ],
        when: 'Revisa la precisión cada vez que subas k.',
        whenNot: 'No bajes k hasta perder respuestas: primero el recall.',
        problems:
          'Creer que más contexto es más seguro. Con 10 trozos y poco presupuesto, el bueno se queda fuera. Baja k y ordena.',
      },
      example:
        'Antes de verlo: recuperas 10 trozos y solo 1 tiene la respuesta. ¿Qué precisión es esa?',
      frames: [
        'Con k = 10, uno de cada diez trozos es útil y el presupuesto se va en el resto.',
        'Con k = 5 y del mejor al peor, las respuestas salen todas y sobra la mitad del relleno.',
      ],
    },
    en: {
      title: 'Filler context',
      goal: 'This prompt carries 10 chunks "so nothing is missing". Keep only the ones needed: every answer right and more useful chunks per retrieved one.',
      theory: {
        what: 'Filler is the chunks that get into the prompt without holding the answer: they spend budget and hand the model look-alike sentences to trip on.',
        how: [
          'k = 10  # 1 good chunk and 9 of filler',
          'k = 5   # the good one and little else',
          'precision = good / retrieved',
        ],
        when: 'Check precision every time you raise k.',
        whenNot: 'Do not lower k until you lose answers: recall first.',
        problems:
          'Thinking more context is safer. With 10 chunks and little budget, the right one stays out. Lower k and order them.',
      },
      example:
        'Before you look: you retrieve 10 chunks and only 1 holds the answer. What precision is that?',
      frames: [
        'With k = 10, one chunk in ten is useful and the budget goes on the rest.',
        'With k = 5 and best to worst, every answer comes out and half the filler is gone.',
      ],
    },
    tasks: [
      {
        kind: 'tune',
        base: { budget: 200, k: 10, order: 'worst' },
        knobs: ['k', 'order'],
        questions: DEV_FOUND,
        objectives: [
          { metric: 'answers', op: '>=' },
          { metric: 'precision', op: '>=' },
        ],
        solution: [{}, { k: 5, order: 'best' }],
      },
    ],
    example: [
      {
        show: 'metrics',
        config: { budget: 200, k: 10, order: 'worst' },
        questions: DEV_FOUND,
        keys: ['answers', 'precision', 'tokens'],
      },
      {
        show: 'metrics',
        config: { budget: 200, k: 5 },
        questions: DEV_FOUND,
        keys: ['answers', 'precision', 'tokens'],
      },
    ],
  },
  {
    id: 'rag-boss-proof',
    block: 6,
    tier: 'intermediate',
    kind: 'boss',
    limit: 300,
    es: {
      title: 'Responde, pero con pruebas',
      goal: 'Deja un bot que no inventa, cita lo que dice, reconoce lo que no sabe y no arrastra relleno.',
      story:
        'Legal ha visto la captura del lunes y pone condiciones para volver a abrir el bot a clientes: ninguna respuesta inventada, todas con su fuente y un «no lo sé» cuando no esté en la documentación. Auditan mañana con preguntas trampa.',
      tasks: [
        'Fundamento, citas y listón: nada inventado, todo citado y «no lo sé» en las preguntas trampa.',
        'Fuera el relleno: todas las respuestas bien con menos trozos y mejor ordenados.',
      ],
    },
    en: {
      title: 'Answer, but with proof',
      goal: 'Leave a bot that does not invent, cites what it says, admits what it does not know and carries no filler.',
      story:
        'Legal saw the Monday screenshot and set conditions to reopen the bot to customers: no made-up answers, every one with its source and an "I do not know" when it is not in the documentation. They audit tomorrow with trick questions.',
      tasks: [
        'Grounding, citations and bar: nothing made up, everything cited and "I do not know" on the trick questions.',
        'Out with the filler: every answer right with fewer, better-ordered chunks.',
      ],
    },
    tasks: [
      {
        kind: 'tune',
        base: CARELESS,
        knobs: ['strict', 'labels', 'minSupport'],
        questions: DEV,
        objectives: [
          { metric: 'invented', op: '<=' },
          { metric: 'cited', op: '>=' },
          { metric: 'abstain', op: '>=' },
        ],
        solution: [{ strict: true, labels: true, minSupport: 3 }],
      },
      {
        kind: 'tune',
        base: { budget: 200, k: 10, order: 'worst' },
        knobs: ['k', 'order'],
        questions: DEV_FOUND,
        objectives: [
          { metric: 'answers', op: '>=' },
          { metric: 'precision', op: '>=' },
        ],
        solution: [{ k: 5, order: 'best' }],
      },
    ],
  },
  {
    id: 'rag-final-intermediate',
    block: 6,
    tier: 'intermediate',
    kind: 'final',
    limit: 600,
    es: {
      title: 'El bot de soporte, bien hecho',
      goal: 'Monta la tubería entera, de la búsqueda a la respuesta, y pásala por las preguntas que nadie del equipo ha visto.',
      story:
        'Vuelve a abrirse el bot de soporte y esta vez lo montas tú de punta a punta. Tienes el buscador léxico del primer día, un prompt sin presupuesto pensado y un generador que contesta lo que sea. Soporte ha guardado preguntas nuevas para la prueba final.',
      tasks: [
        'Recuperación: híbrido con el trozo bueno arriba, sin disparar la latencia.',
        'Prompt: que el trozo bueno entre siempre, gastando lo justo.',
        'Respuesta: sobre las preguntas nuevas, nada inventado, todo citado y «no lo sé» cuando toca.',
      ],
    },
    en: {
      title: 'The support bot, done right',
      goal: 'Build the whole pipeline, from search to answer, and run it past the questions nobody on the team has seen.',
      story:
        'The support bot reopens and this time you build it end to end. You have the day-one lexical search, a prompt with no thought-out budget and a generator that answers anything. Support has kept new questions for the final test.',
      tasks: [
        'Retrieval: hybrid with the right chunk on top, without latency shooting up.',
        'Prompt: the right chunk always in, spending just enough.',
        'Answer: on the new questions, nothing made up, everything cited and "I do not know" when due.',
      ],
    },
    tasks: [
      {
        kind: 'tune',
        base: { ...LEXICAL, rerank: false },
        knobs: ['mode', 'weight', 'rerank', 'depth'],
        questions: DEV_FOUND,
        objectives: [
          { metric: 'mrr', op: '>=' },
          { metric: 'latency', op: '<=' },
        ],
        solution: [{ mode: 'hybrid', weight: 0.5, rerank: true, depth: 5 }],
      },
      {
        kind: 'tune',
        base: { k: 8, budget: 90, order: 'file' },
        knobs: ['k', 'budget', 'order'],
        questions: DEV_FOUND,
        objectives: [
          { metric: 'context', op: '>=' },
          { metric: 'tokens', op: '<=' },
        ],
        solution: [{ k: 5, budget: 150, order: 'best' }],
      },
      {
        kind: 'tune',
        base: { ...CARELESS, rerank: true, depth: 5 },
        knobs: ['strict', 'labels', 'minSupport'],
        questions: TEST,
        objectives: [
          { metric: 'invented', op: '<=' },
          { metric: 'cited', op: '>=' },
          { metric: 'abstain', op: '>=' },
          { metric: 'answers', op: '>=' },
        ],
        solution: [{ strict: true, labels: true, minSupport: 3 }],
      },
    ],
  },
]
