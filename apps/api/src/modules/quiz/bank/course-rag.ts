/**
 * Banco de Not-games: preguntas del curso de RAG (`docs/curso-rag.md`, motor
 * `packages/ragsim`). Generales, como las de los otros cursos, y con el `id`
 * empezando por el del curso (`rag-`).
 *
 * Siguen `docs/plantilla-preguntas.md`: la mala principal de cada concepto es
 * el error típico de su unidad. Lo afirmado se ha comprobado en el motor
 * (`ask`, `judge`, `evaluate`, `buildPrompt`, `rrf`, `idf`, `runWorkload` y
 * `handle`, 2026-11-14). No se pregunta nada que solo valga para el juguete
 * (sus embeddings hechos a mano, su corpus de Colmena): lo que se pregunta es
 * lo que también pasa en un RAG de verdad.
 */

import type { Concept } from './types.js'

export const COURSE_RAG: readonly Concept[] = [
  {
    // Unidades rag-why y rag-grounded: sin contexto, de memoria.
    id: 'rag-context',
    topic: 'rag',
    needs: {},
    kind: 'quick',
    level: 1,
    forms: [
      {
        // Predicción (motor: context: false → kind 'memory', el dato de la versión 1).
        // Las malas son todas «leer la guía», que sin contexto no puede pasar.
        ask: [
          'El modelo aprendió con la versión 1 de tu proyecto y la guía ha cambiado. Sin contexto, ¿qué contesta?',
          'Sin darle ningún trozo de la guía nueva, un modelo entrenado con la versión 1 responde…',
        ],
        right: ['El dato de la versión 1, con aplomo', 'Lo que aprendió: el dato ya viejo'],
        wrong: [
          'El dato nuevo, leído de la guía',
          'La cita de la guía que lo cuenta',
          'El dato nuevo, con su fuente',
          'Un trozo de la guía, sin cambios',
        ],
      },
      {
        // Escenario (motor: sin contexto, 0 respuestas buenas y 15 inventadas en desarrollo).
        ask: [
          'Tu bot contesta datos de una versión vieja y sin citar nada. ¿Qué le falta?',
          'Un bot que responde de memoria, con datos viejos y sin fuentes, necesita…',
        ],
        right: [
          'Los trozos de tus documentos, con su cita',
          'Contexto de tu documentación, citado',
        ],
        wrong: [
          'Un modelo más grande, con más memoria',
          'Más ejemplos de respuestas en el prompt',
          'Trozos más pequeños al trocear',
          'Una caché para las respuestas',
        ],
      },
    ],
    wrong: [],
    why: 'Sin contexto, el modelo contesta de memoria y con aplomo; RAG le da los trozos que tocan para que responda leyendo y cite.',
  },
  {
    // Unidades rag-corpus y rag-leak: qué no se indexa.
    id: 'rag-corpus-filter',
    topic: 'rag',
    needs: {},
    kind: 'quick',
    level: 1,
    forms: [
      {
        // Escenario (motor: con todo cargado, secrets 1 y noise 4; solo docs y code, 0).
        ask: [
          'Vas a indexar un repositorio para tu RAG. ¿Qué fichero dejas fuera?',
          'Al cargar el corpus de tu RAG, ¿cuál de estos ficheros no indexas?',
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
        // Diagnóstico (motor: con eval cargado, leaks 2: el bot copia la respuesta esperada).
        ask: [
          'Tras indexar todo el repositorio, tu RAG copia las respuestas de la evaluación. ¿Qué entró en el índice?',
          'Tu RAG puntúa de maravilla porque copia las respuestas esperadas. ¿Qué se coló al indexar?',
        ],
        right: [
          'Las preguntas de evaluación con su respuesta',
          'El fichero de evaluación, con las soluciones',
        ],
        wrong: [
          'Un fichero con contraseñas',
          'Un fichero que repite palabras clave',
          'Trozos repetidos por el solape',
          'El código sin documentar',
        ],
      },
    ],
    wrong: [],
    why: 'Lo que indexas puede salir en una respuesta: fuera secretos (.env), ruido (.lock) y las preguntas de evaluación, que inflan la nota.',
  },
  {
    // Unidades rag-chunk-size y rag-chunk-overlap: el corte que parte la respuesta.
    id: 'rag-chunk-cut',
    topic: 'rag',
    needs: {},
    kind: 'quick',
    level: 2,
    forms: [
      {
        // Diagnóstico (motor: stage 'chunking' cuando ningún trozo trae la frase entera;
        // con trozos fijos de 10 palabras, 11 de 13 preguntas se pierden ahí).
        ask: [
          'Tu banco de pruebas marca «Se pierde al trocear». ¿Qué quiere decir?',
          'Una pregunta se pierde al trocear. ¿Qué les ha pasado a los trozos?',
        ],
        right: [
          'La frase de la respuesta quedó partida en dos',
          'Un corte partió la respuesta por la mitad',
        ],
        wrong: [
          'El trozo bueno no cabe en el prompt',
          'El buscador no encuentra el trozo bueno',
          'El modelo se inventa la respuesta',
          'Hay demasiados trozos para buscar',
        ],
      },
      {
        // Escenario (motor: con solape, más preguntas tienen su frase entera en algún trozo).
        ask: [
          'La frase de una respuesta cae justo entre dos trozos. ¿Qué cambio lo arregla?',
          'Un corte parte por la mitad la frase con la respuesta. ¿Qué ajustas?',
        ],
        right: ['Un poco de solape entre trozos', 'Trozos algo más grandes o con solape'],
        wrong: [
          'Un reordenado de los candidatos',
          'Búsqueda semántica en vez de léxica',
          'Trozos más pequeños y más numerosos',
          'Quitar las palabras vacías',
        ],
      },
    ],
    wrong: [],
    why: 'Si un corte parte la frase de la respuesta, ningún trozo la tiene entera: sube el tamaño o añade el solape justo.',
  },
  {
    // Unidad rag-tokens: normalizar.
    id: 'rag-normalize',
    topic: 'rag',
    needs: {},
    kind: 'quick',
    level: 2,
    forms: [
      {
        // Diagnóstico (motor: sin normalizar, la lista léxica de «LIMITE DE TAMANO» sale vacía;
        // normalizando, encuentra docs/colas.md).
        ask: [
          'La consulta «LIMITE DE TAMANO» no encuentra el trozo que dice «Límite de tamaño». ¿Qué falta?',
          'Con BM25, «LIMITE DE TAMANO» no da nada, aunque el documento dice «Límite de tamaño». ¿Qué te falta?',
        ],
        right: ['Normalizar: minúsculas y sin acentos', 'Pasar todo a minúsculas y quitar tildes'],
        wrong: [
          'Subir k1 para que repetir sume más',
          'Bajar b para no castigar los largos',
          'Más solape entre los trozos',
          'Pedir más resultados (k = 10)',
        ],
      },
      {
        // Definición. Malas: IDF, b, troceado, embeddings.
        ask: [
          '¿Para qué se normalizan los tokens antes de indexar?',
          'Normalizar el texto al tokenizar sirve para…',
        ],
        right: [
          'Que no cuenten mayúsculas, acentos ni plurales',
          'Que «Límite» y «limite» sean la misma palabra',
        ],
        wrong: [
          'Que cada palabra pese según lo rara que es',
          'Que los trozos largos no ganen por largos',
          'Que todos los trozos midan lo mismo',
          'Que cada palabra se vuelva un vector',
        ],
      },
    ],
    wrong: [],
    why: 'Normalizar quita lo que no importa al comparar (mayúsculas, acentos, plurales); sin eso, «LIMITE» y «Límite» son palabras distintas.',
  },
  {
    // Unidad rag-tfidf: la palabra rara decide.
    id: 'rag-idf',
    topic: 'rag',
    needs: {},
    kind: 'quick',
    level: 2,
    forms: [
      {
        // Predicción (fórmula del motor, ln(1 + (N − df + 0,5) / (df + 0,5)): 0,30 frente a 2,80).
        ask: [
          'En un índice de 40 trozos, «tarea» sale en 30 y «heartbeat», en 2. ¿Cuál pesa más en BM25?',
          'Con 40 trozos, «tarea» está en 30 y «heartbeat» en 2. Al puntuar con BM25, decide más…',
        ],
        right: ['«heartbeat», por salir en pocos trozos', '«heartbeat»: es la palabra rara'],
        wrong: [
          '«tarea», por salir en muchos trozos',
          'Las dos igual: una vez cada una',
          '«tarea», por ir primero en la consulta',
          'La que sea más larga de las dos',
        ],
      },
      {
        // Predicción (motor: con df = N, el IDF es ln(1 + 0,5 / (N + 0,5)), casi 0).
        ask: [
          'Una palabra sale en casi todos los trozos del índice. ¿Cuánto aporta a la puntuación BM25?',
          'Si un término está en casi todos los trozos, en BM25 cuenta…',
        ],
        right: ['Casi nada: su IDF es muy bajo', 'Muy poco, porque no distingue trozos'],
        wrong: [
          'Mucho: sale en todas partes',
          'Lo mismo que cualquier otra palabra',
          'Mucho, si el trozo es corto',
          'Depende solo de su TF en el trozo',
        ],
      },
    ],
    wrong: [],
    why: 'IDF mide cuánto distingue una palabra: casi cero si sale en todos los trozos, alto si sale en pocos. Decide la palabra rara.',
  },
  {
    // Unidad rag-bm25: k1 y la repetición.
    id: 'rag-bm25-k1',
    topic: 'rag',
    needs: {},
    kind: 'quick',
    level: 2,
    forms: [
      {
        // Definición. Malas: b, k, peso del híbrido, solape.
        ask: ['En BM25, ¿qué controla el parámetro `k1`?', 'El `k1` de BM25 decide…'],
        right: [
          'Cuánto sigue sumando repetir una palabra',
          'Cuánto puntúa repetir el término en el trozo',
        ],
        wrong: [
          'Cuánto se castiga a los trozos largos',
          'Cuántos resultados devuelve la búsqueda',
          'Cuánto pesa la lista semántica',
          'Cuántas palabras solapan dos trozos',
        ],
      },
      {
        // Escenario (motor, b = 0: con k1 = 3 sale primero poetry.lock; con k1 = 0,4, la guía).
        ask: [
          'Un fichero que repite «retry» sin parar sale el primero en BM25 y no lo puedes quitar. ¿Qué tocas?',
          'Un trozo de ruido gana en BM25 solo por repetir la palabra buscada. ¿Qué ajustas?',
        ],
        right: ['Bajar k1 para que repetir sume poco', 'Bajar k1: repetir se satura antes'],
        wrong: [
          'Subir k1 para que la palabra cuente más',
          'Subir k para ver más resultados',
          'Quitar la normalización de tokens',
          'Subir el solape entre trozos',
        ],
      },
    ],
    wrong: [],
    why: 'k1 dice cuánto sigue sumando repetir una palabra: con k1 alto gana quien más la repite, no quien responde.',
  },
  {
    // Unidades rag-embed, rag-semantic y rag-hybrid: cada búsqueda acierta en lo suyo.
    id: 'rag-search-kind',
    topic: 'rag',
    needs: {},
    kind: 'quick',
    level: 2,
    forms: [
      {
        // Predicción (motor: «¿Cuánto tarda en volver a intentarlo?»: léxica, sin acierto;
        // semántica, 2.º).
        ask: [
          'La guía dice «reintentos» y alguien pregunta cuánto tarda en «volver a intentarlo». ¿Qué búsqueda da con el trozo?',
          'Si preguntan con otras palabras que las de tu guía, ¿qué búsqueda encuentra el trozo bueno?',
        ],
        right: ['La semántica, por embeddings', 'La que compara vectores (coseno)'],
        wrong: [
          'La léxica, con BM25',
          'La léxica, si normalizas acentos',
          'La léxica, con un k1 más alto',
          'Ninguna: hacen falta las mismas palabras',
        ],
      },
      {
        // Predicción (motor: «Where is backoff_seconds defined?»: léxica 1.º, semántica 5.º).
        ask: [
          'Preguntas dónde está definida `backoff_seconds`. ¿Qué búsqueda pone primero el trozo de esa función?',
          'Con un identificador exacto en la consulta, como `backoff_seconds`, acierta mejor…',
        ],
        right: ['La léxica, con BM25', 'La que compara palabras (BM25)'],
        wrong: [
          'La semántica, por embeddings',
          'La que compara vectores (coseno)',
          'Las dos, exactamente igual',
          'Ninguna de las dos la encuentra',
        ],
      },
      {
        // Escenario (motor: la híbrida trae entre los 3 primeros «run twice», «--legacy»,
        // «volver a intentarlo» y «backoff_seconds»; cada una sola pierde alguna).
        ask: [
          'Unas preguntas usan nombres exactos y otras, palabras distintas a las de la guía. ¿Qué búsqueda montas?',
          'Si tu gente pregunta tanto por identificadores como con sus propias palabras, te conviene…',
        ],
        right: [
          'Una híbrida que junte léxica y semántica',
          'Las dos, léxica y semántica, fusionadas',
        ],
        wrong: [
          'Solo semántica, que entiende el sentido',
          'Solo léxica, con un k más alto',
          'Solo léxica, con más solape',
          'Solo semántica, con trozos más grandes',
        ],
      },
    ],
    wrong: [],
    why: 'La léxica acierta con palabras e identificadores exactos y la semántica, con otras palabras; la híbrida junta las dos listas.',
  },
  {
    // Unidades rag-rrf y rag-weights: fusionar por puestos.
    id: 'rag-rrf',
    topic: 'rag',
    needs: {},
    kind: 'long',
    level: 3,
    forms: [
      {
        // Cálculo (motor: rrf con peso 0,5 y k = 60 → 1/61 + 1/63 = 0,0323).
        ask: [
          'Con RRF y k = 60, un trozo va 1.º en la lista léxica y 3.º en la semántica. ¿Cuánto suma?',
          'En RRF (k = 60), un trozo 1.º en una lista y 3.º en la otra puntúa…',
        ],
        right: ['1/61 + 1/63'],
        wrong: ['1/1 + 1/3', '1/61 + 1/61', '1/(60 + 1 + 3)', '61 + 63', '60/1 + 60/3'],
      },
      {
        // Diagnóstico (motor: BM25 da cifras como 9,1 y el coseno, como mucho 1).
        ask: [
          'Juntas las listas sumando BM25 y coseno, y la fusión sale igual que la léxica. ¿Por qué?',
          'Al sumar BM25 y coseno tal cual, la lista léxica lo decide todo. ¿Qué pasa?',
        ],
        right: [
          'BM25 da números grandes y el coseno no pasa de 1',
          'Están en escalas distintas y BM25 manda',
        ],
        wrong: [
          'La semántica no encontró ningún trozo',
          'BM25 se calcula después y pisa al coseno',
          'Faltó normalizar los tokens de la consulta',
          'El coseno solo cuenta para el primer trozo',
        ],
      },
    ],
    wrong: [],
    why: 'RRF mira solo los puestos: cada lista suma 1/(k + puesto). Sumar BM25 y coseno tal cual no vale: son escalas distintas.',
  },
  {
    // Unidades rag-budget, rag-fits y rag-order: el presupuesto corta.
    id: 'rag-prompt-budget',
    topic: 'rag',
    needs: {},
    kind: 'long',
    level: 3,
    forms: [
      {
        // Cálculo (motor: buildPrompt con 40 fijos y trozos de 23 + 2 de etiqueta → entran 2).
        ask: [
          'Presupuesto: 100 tokens. Instrucciones y pregunta gastan 40, y cada trozo, con su etiqueta, 25. ¿Cuántos trozos entran?',
          'Con 100 tokens de presupuesto, 40 de lo fijo y trozos de 25 (etiqueta incluida), ¿cuántos caben?',
        ],
        right: ['2'],
        wrong: ['3', '4', '1', '0'],
      },
      {
        // Diagnóstico (motor: con k = 5 y 120 tokens, del peor al mejor se pierden 8 en el prompt;
        // del mejor al peor, 2).
        ask: [
          'Recuperas 5 trozos y el mejor, el 1.º de la lista, se queda fuera del prompt. ¿Qué pasó?',
          'El trozo mejor puntuado no entra en el prompt y los peores sí. ¿Por qué?',
        ],
        right: [
          'Llenaste del peor al mejor y el corte lo dejó fuera',
          'Entraron en orden inverso y el presupuesto cortó',
        ],
        wrong: [
          'El buscador no lo llegó a devolver',
          'El troceado partió la respuesta',
          'El modelo lo leyó y no lo citó',
          'El presupuesto no cuenta la pregunta',
        ],
      },
    ],
    wrong: [],
    why: 'El prompt se llena en orden hasta el presupuesto y el primero que no cabe corta: llénalo del mejor al peor y cuenta lo fijo.',
  },
  {
    // Unidades rag-idk y rag-filler: decir «no lo sé».
    id: 'rag-idk',
    topic: 'rag',
    needs: {},
    kind: 'quick',
    level: 3,
    forms: [
      {
        // Escenario (motor: «¿Cuánto cuesta la licencia de Colmena?» con respaldo mínimo 1 cita
        // una frase del README sobre lo que hace falta instalar; con 3, «no lo sé»).
        ask: [
          'Preguntas cuánto cuesta la licencia, que tu corpus no dice, y el bot cita una frase del README. ¿Qué ajustas?',
          'Ante una pregunta sin respuesta en el corpus, el bot contesta algo que solo se parece, con cita. ¿Qué cambias?',
        ],
        right: [
          'Subir el respaldo mínimo para que diga «no lo sé»',
          'Exigir más respaldo antes de dar una respuesta',
        ],
        wrong: [
          'Subir k para que encuentre la licencia',
          'Quitar las citas de las respuestas',
          'Bajar el respaldo mínimo a 1',
          'Dar más presupuesto al prompt',
        ],
      },
      {
        // Definición. Malas: k y presupuesto, umbral al buscar, citas, tiempo.
        ask: [
          '¿Para qué sirve el respaldo mínimo al generar?',
          'El respaldo mínimo del generador sirve para…',
        ],
        right: [
          'Decir «no lo sé» si nada respalda lo bastante',
          'Callar cuando el contexto apoya poco la respuesta',
        ],
        wrong: [
          'Fijar cuántos trozos entran en el prompt',
          'Descartar trozos con poco coseno al buscar',
          'Decidir cuántas citas lleva cada respuesta',
          'Limitar cuánto tarda el modelo en contestar',
        ],
      },
    ],
    wrong: [],
    why: 'Con un respaldo mínimo, si ninguna frase del contexto apoya lo bastante la respuesta, el bot dice «no lo sé» en vez de contestar lo más parecido.',
  },
  {
    // Unidades rag-recall y rag-ranking: medir la recuperación.
    id: 'rag-recall-mrr',
    topic: 'rag',
    needs: {},
    kind: 'long',
    level: 4,
    forms: [
      {
        // Cálculo: recall@3 = 3 / 4.
        ask: [
          'De 4 preguntas, el trozo bueno sale entre los 3 primeros en 3 de ellas. ¿Qué recall@3 da?',
          'Tu buscador trae el trozo bueno en el top 3 en 3 de 4 preguntas. Su recall@3 es…',
        ],
        right: ['0,75'],
        wrong: ['0,25', '3', '0,33', '1'],
      },
      {
        // Cálculo (motor: mrr = media de 1/puesto → (1 + 1/2 + 1/4) / 3 = 0,58). Malas: media de
        // los puestos, su inversa, la suma sin dividir.
        ask: [
          'En 3 preguntas, el primer acierto sale en los puestos 1, 2 y 4. ¿Qué MRR da?',
          'Primer trozo bueno en los puestos 1, 2 y 4 de tres preguntas: el MRR es…',
        ],
        right: ['0,58'],
        wrong: ['2,33', '0,43', '1,75', '0,25', '0,33'],
      },
      {
        // Cálculo (motor: precisión = buenos recuperados / k; la unidad rag-topk da 0,10).
        ask: [
          'Recuperas 10 trozos y solo 1 tiene la respuesta. ¿Qué precisión@10 da?',
          'Con k = 10 y un único trozo bueno entre los recuperados, la precisión es…',
        ],
        right: ['0,1'],
        wrong: ['1', '10', '0,9', '0,5'],
      },
    ],
    wrong: [],
    why: 'recall@k cuenta en cuántas preguntas está el bueno entre los k; el MRR premia que salga pronto (media de 1/puesto); la precisión, cuánto de lo traído sirve.',
  },
  {
    // Unidades rag-crossval y rag-leak: afinar sin mirar la prueba.
    id: 'rag-eval-split',
    topic: 'rag',
    needs: {},
    kind: 'quick',
    level: 4,
    forms: [
      {
        // Cálculo: la media de los grupos, (1 + 0,5 + 0,6) / 3 = 0,70. Malas: el mejor grupo
        // (el error típico de la unidad), el peor, el punto medio, la suma.
        ask: [
          'Con validación cruzada, una configuración saca 1,00, 0,50 y 0,60 en tres grupos. ¿Qué nota le das?',
          'Tres grupos de preguntas dan 1,00, 0,50 y 0,60 a la misma configuración. Vale…',
        ],
        right: ['0,70'],
        wrong: ['1,00', '0,50', '0,75', '2,10'],
      },
      {
        // Escenario: afinar con las de prueba es la fuga de la unidad rag-leak.
        ask: [
          'Afinas el RAG mirando las preguntas de prueba hasta sacar 1,00 en ellas. ¿Qué has hecho mal?',
          'Eliges la configuración por su nota en las preguntas de prueba, que eran las apartadas. ¿Qué falla?',
        ],
        right: [
          'Afinaste con las de prueba: ya no miden nada',
          'Usar lo apartado para afinar y no para comprobar',
        ],
        wrong: [
          'Probar demasiado pocas configuraciones',
          'No subir k hasta el máximo',
          'Medir con recall en vez de con MRR',
          'No usar reordenado en la búsqueda',
        ],
      },
    ],
    wrong: [],
    why: 'Se afina con las de desarrollo y con la media de varios grupos; las de prueba se miran una vez, al final, o la nota deja de medir.',
  },
  {
    // Unidad rag-cache: respuestas viejas y la clave.
    id: 'rag-cache',
    topic: 'rag',
    needs: {},
    kind: 'quick',
    level: 4,
    forms: [
      {
        // Diagnóstico (motor: runWorkload con caché sin vaciar al reindexar → 1 respuesta vieja;
        // vaciándola, 0).
        ask: [
          'La guía pasa de 5 a 7 reintentos, reindexas y el bot sigue diciendo 5. ¿Qué falló?',
          'Tras cambiar una guía y reindexar, el bot repite la respuesta de antes. ¿Por qué?',
        ],
        right: ['La caché no se vació al reindexar', 'La caché sigue dando la respuesta vieja'],
        wrong: [
          'El modelo recuerda la versión anterior',
          'El troceado partió la frase nueva',
          'BM25 prefiere el número antiguo',
          'El k de la búsqueda es muy bajo',
        ],
      },
      {
        // Escenario (motor: con la clave normalizada, la pregunta en mayúsculas acierta en la caché).
        ask: [
          'La misma pregunta escrita en mayúsculas no acierta en tu caché. ¿Qué cambias?',
          'Tu caché trata «RETRY» y «retry» como dos preguntas distintas. ¿Qué arreglas?',
        ],
        right: [
          'Normalizar la pregunta antes de usarla de clave',
          'La clave: que sea la pregunta normalizada',
        ],
        wrong: [
          'Vaciar la caché cada vez que reindexas',
          'Darle más sitio a la caché',
          'Guardar también los trozos recuperados',
          'Indexar el corpus también en mayúsculas',
        ],
      },
    ],
    wrong: [],
    why: 'La caché ahorra buscar y generar, pero hay que vaciarla al reindexar (o servirá respuestas viejas) y usar de clave la pregunta normalizada.',
  },
  {
    // Unidad rag-api: validar antes de buscar.
    id: 'rag-api',
    topic: 'rag',
    needs: {},
    kind: 'quick',
    level: 4,
    forms: [
      {
        // Predicción (motor: handle → 422 k_out_of_range; consulta vacía, 422 empty_query).
        ask: [
          'La API de tu RAG recibe `POST /answer` con `k = 1000`. Si valida antes de buscar, ¿qué código devuelve?',
          '`POST /answer` llega con `k = 1000`. Una API que valida antes de buscar responde…',
        ],
        right: ['422'],
        wrong: ['200', '500', '404', '405', '413'],
      },
      {
        // Definición del porqué.
        ask: [
          '¿Para qué valida tu API `k` y la consulta antes de buscar?',
          'Tu API comprueba `q` y `k` antes de tocar el índice. Lo hace para…',
        ],
        right: ['Que un k enorme no tumbe el servicio', 'No gastar trabajo en peticiones malas'],
        wrong: [
          'Que la caché guarde más respuestas',
          'Subir el recall de la búsqueda',
          'Que el modelo cite mejor sus fuentes',
          'Devolver siempre un código 200',
        ],
      },
    ],
    wrong: [],
    why: 'Una API valida antes de trabajar: una consulta vacía o un k fuera de rango son un 422, no una búsqueda que tumbe el servicio.',
  },
  {
    // Unidad rag-failures: en qué etapa se pierde.
    id: 'rag-stages',
    topic: 'rag',
    needs: {},
    kind: 'long',
    level: 4,
    forms: [
      {
        // Diagnóstico (motor: judge → 'prompt' si está entre los k y no entra).
        ask: [
          'El trozo bueno está entre los k recuperados, pero el modelo no llega a leerlo. ¿Qué etapa falla?',
          'Lo trae la búsqueda, pero no está entre lo que lee el modelo. ¿En qué etapa se pierde?',
        ],
        right: ['El montaje del prompt'],
        wrong: ['El troceado', 'La búsqueda', 'La generación', 'La carga del corpus'],
      },
      {
        // Diagnóstico (motor: judge → 'retrieval' si está entero en un trozo y no entre los k).
        ask: [
          'La respuesta está entera en un trozo, pero ese trozo no sale entre los k primeros. ¿Qué etapa falla?',
          'Un trozo tiene la frase buena entera y no aparece en los resultados. ¿Dónde se pierde?',
        ],
        right: ['La búsqueda', 'La recuperación'],
        wrong: ['El troceado', 'El montaje del prompt', 'La generación', 'La carga del corpus'],
      },
      {
        // Diagnóstico (motor: judge → 'chunking' si ningún trozo trae la frase entera).
        ask: [
          'Ningún trozo del índice tiene entera la frase con la respuesta. ¿Qué etapa falla?',
          'La frase buena no está completa en ningún trozo. ¿Dónde se pierde la respuesta?',
        ],
        right: ['El troceado'],
        wrong: ['La búsqueda', 'El montaje del prompt', 'La generación', 'El reordenado'],
      },
    ],
    wrong: [],
    why: 'Sigue el trozo bueno: si no está entero, falla el troceado; si no está entre los k, la búsqueda; si no entra, el prompt; si entra y no sale, la generación.',
  },
]
