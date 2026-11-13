# Curso de RAG

Un curso para construir un RAG (Retrieval-Augmented Generation: buscar en tus
documentos antes de responder) entendiendo cada pieza, en el orden en que se
construye: cargar y trocear, buscar por palabras y por significado, juntar las
dos listas, montar el prompt, responder con citas, medirlo, afinarlo y dejarlo
en producción. Pedido por Alberto el 2026-11-13, pensando en quien va a hacer
el proyecto de 42 «RAG against the machine»: el curso no da el proyecto hecho,
pero al acabar cada bloque dice qué pieza de tu propio RAG ya puedes escribir.

Sigue la [plantilla de cursos](plantilla-cursos.md): cada conocimiento tiene
**teoría, ejemplo y prueba**, cada bloque acaba en un **jefe contrarreloj** y
cada nivel en un **jefe final** que da su certificado. Está en Aprender,
pestaña «Curso de RAG» (`#/cursorag`), y los certificados salen también en el
perfil. No pide haber hecho antes ningún otro curso (no lleva
`CourseOrderHint`).

## Lo que cambia frente a los cursos de terminal

- **La prueba es un banco de pruebas, no una terminal.** Según la unidad, se
  ajustan los mandos de la tubería (tamaño y solape del troceado, k, k1 y b,
  peso del híbrido, presupuesto del prompt…), se calcula algo a mano (un TF,
  un IDF, un coseno, una puntuación RRF, un recall@k, un MRR), se eligen
  trozos o una configuración, se ordenan trozos o se hace una petición a la
  API del RAG.
- **Mirar es gratis; comprobar cuenta.** Mover los mandos repinta la tubería
  al momento sobre la consulta que elijas (el documento con sus trozos, las
  barras de BM25 y de coseno, la fusión, el prompt con su presupuesto y la
  respuesta con su cita). Lo que cuenta para las estrellas es cada «Comprobar».
- **El objetivo sale de ejecutar la solución**, como en los demás cursos: en
  las tareas de ajustar, el umbral de cada objetivo («recall@3 ≥ 0,77 con un
  prompt de ≤ 141 tokens») es lo que mide la configuración de referencia; en
  las de calcular, elegir y ordenar, lo que vale lo calcula el motor.
- **El ejemplo es la tubería en marcha**: los pasos salen solos, uno a uno,
  con lo que el motor ha hecho de verdad y una pregunta de predicción delante.

## Los niveles

El mundo es siempre el mismo: el repositorio de **Colmena**, una cola de
tareas en Python que no existe, con guías en castellano y en inglés
(`docs/*.md`, `README.md`), código (`src/colmena/*.py`) y tres cosas que no
deberían indexarse: un `.env` con una contraseña, un `poetry.lock` que repite
palabras clave y `eval/preguntas.jsonl`, las preguntas de evaluación con su
respuesta. Hay 25 preguntas de referencia con el sitio exacto de su respuesta:
con las palabras del documento, con otras palabras o en el otro idioma, y sin
respuesta (lo correcto es «no lo sé»); partidas en desarrollo y prueba.

### Principiante: recuperar

| Bloque | Unidades (qué se hace en su prueba) | Jefe (límite) |
| --- | --- | --- |
| 1. RAG y el corpus | por qué buscar antes de responder (encender el contexto) · qué se carga (fuera secretos y ruido) · tamaño del troceado · solape · troceado por estructura | El bot de soporte se inventa las respuestas (4 min) |
| 2. Búsqueda léxica | tokens y normalización · TF e IDF a mano · BM25: k1 y b contra un fichero que repite palabras · cuántos resultados (k) | Nadie encuentra nada en la wiki (5 min) |
| 3. Búsqueda semántica | embeddings (contar conceptos) · coseno a mano · búsqueda semántica con preguntas en otras palabras | La consulta con otras palabras (5 min) |
| **Jefe final** | Tu primer buscador: corpus y troceado, tokens, y el buscador y el k que más aciertan | 8 min |

### Intermedio: híbrido, prompt y generación

| Bloque | Unidades | Jefe |
| --- | --- | --- |
| 4. Híbrido y reordenado | búsqueda híbrida · RRF a mano y ordenar la lista fusionada · pesos del híbrido · reordenado y su latencia | Dos buscadores, una sola lista (5 min) |
| 5. El prompt | presupuesto de tokens · contar lo que cabe · el orden al llenar | El contexto no cabe (5 min) |
| 6. Generación con fundamento | fundamento y citas · saber decir «no lo sé» · contexto de relleno | Responde, pero con pruebas (5 min) |
| **Jefe final** | El bot de soporte, bien hecho: recuperación, prompt y respuesta, con las preguntas de prueba | 10 min |

### Avanzado: evaluar, afinar y producción

| Bloque | Unidades | Jefe |
| --- | --- | --- |
| 7. Evaluar | recall@k a mano · precisión y MRR · el conjunto de referencia (marcar los trozos buenos) · no evaluar a ojo (medir tres configuraciones) | ¿Ha mejorado o lo parece? (6 min) |
| 8. Afinar sin sobreajustar | fugas del conjunto de evaluación (afinar con desarrollo, comprobar con prueba) · validación cruzada · coste y beneficio | El 100 % que no era (6 min) |
| 9. Producción | indexado incremental · caché de consultas (sin respuestas viejas) · la API (códigos y validación) · diagnóstico por etapas | Día de lanzamiento (6 min) |
| **Jefe final** | RAG against the machine: la tubería entera medida con preguntas apartadas, dos fallos diagnosticados y lo de producción | 12 min |

En total: 33 unidades (12 de principiante, 10 de intermedio y 11 de avanzado),
9 jefes y 3 jefes finales: 45 puntos.

## Estrellas y tiempo

- **Unidades**: por comprobaciones (`tryGoals` de `@sanatorio/course`, la regla
  hermana de `commandGoals`). ★★★ con las comprobaciones de la solución de
  referencia más una de margen (un tropiezo no quita la tercera), ★★☆ hasta el
  doble más dos, ★☆☆ con las que sean. La solución de una unidad de ajustar
  son dos comprobaciones (medir cómo está y arreglarlo): ★★★ con 3 o menos;
  la de una de calcular o elegir es una: ★★★ con 2 o menos. Lo mal formado no
  cuenta ni rompe, y varias configuraciones equivalentes valen igual (lo
  comprueba `apps/api/tests/unit/ragsim-course.test.ts`).
- **Jefes**: por tiempo, con el reloj de la API. Tienen varias tareas (una
  pestaña cada una) y hacen falta todas, en el orden que se quiera.
- **La API vuelve a corregir**: la web manda las comprobaciones hechas (un
  JSON corto cada una) y la API las corrige una a una con el mismo motor.

## Tiempo estimado

Con el modelo común (`docs/plantilla-cursos.md`), a 2026-11-13. Donde los
cursos de terminal cuentan órdenes, aquí se cuenta lo que hay que decidir
(mandos, números, elecciones):

| Nivel | Bloques | Tiempo |
| --- | --- | --- |
| Principiante | 42 + 45 + 32 min, y el jefe final (13) | ~2 h 12 min |
| Intermedio | 40 + 29 + 29 min, y el jefe final (15) | ~1 h 53 min |
| Avanzado | 36 + 34 + 41 min, y el jefe final (18) | ~2 h 9 min |
| **Todo el curso** | | **~6 h 14 min** |

## Juego

Como los demás cursos (`docs/cursos-logros.md`): estrellas, clasificación
propia en Campus → Clasificaciones, certificados en el perfil y cinco logros
con título, banner (líneas de un documento con el trozo encontrado) y XP:
`rag_first` («top_k = 3»), `rag_beginner` («Aguja en el pajar»),
`rag_intermediate` («Con fuentes, por favor»), `rag_advanced` («RAG against
the machine») y `rag_bosses` («Cero alucinaciones»). No entra en los logros de
«los cuatro cursos» (empezarlos, terminarlos, en orden): esos siguen siendo de
shell, git, Docker y Kubernetes.

## Guía de construcción: tu RAG, pieza a pieza

Lo mismo que sale en el curso (arriba del camino, dentro de cada bloque y al
vencer a su jefe). El orden de los bloques es el orden en que se construye.
Son esqueletos, no la solución: el código es tuyo.

### 1. RAG y el corpus

**Pieza:** El cargador y el troceador: de una carpeta a una lista de trozos con su ruta y sus líneas.

```python
def load_documents(root, extensions=(".md", ".py")):
    # recorre root; salta .env, *.lock y lo que no sea texto
    # devuelve [(ruta, texto)]

def chunk(path, text, max_size):
    # .md: corta en cada encabezado; .py: en cada def/class (ast)
    # si un apartado pasa de max_size, pártelo con algo de solape
    # cada trozo guarda ruta, línea inicial y final, y su texto
```

**Cómo comprobarlo:** Imprime cuántos trozos salen y el más largo. Busca a mano tres frases que sabes que responden algo: cada una tiene que estar entera en algún trozo.

### 2. Búsqueda léxica

**Pieza:** El tokenizador y el índice BM25 sobre tus trozos.

```python
def tokenize(text):
    # minúsculas, sin acentos; parte snake_case y camelCase
    # quita palabras vacías; recorta plurales

class BM25Index:
    def __init__(self, chunks, k1=1.2, b=0.75):
        # tf por trozo, df por término, largo medio
    def search(self, query, k):
        # suma idf * tf*(k1+1) / (tf + k1*(1 - b + b*largo/medio))
        # devuelve los k mejores (trozo, puntuación)
```

**Cómo comprobarlo:** Busca el nombre exacto de una función de tu repositorio: su trozo tiene que salir el primero. Cambia k1 y b y mira que el orden cambia.

### 3. Búsqueda semántica

**Pieza:** El índice semántico: un vector por trozo y la búsqueda por coseno.

```python
model = SentenceTransformer("all-MiniLM-L6-v2")  # pequeño, en CPU

def build_semantic(chunks):
    # vectors = model.encode(textos, normalize_embeddings=True)
    # guarda la matriz en disco: calcularla es lo caro

def semantic_search(query, k):
    # q = model.encode([query], normalize_embeddings=True)
    # con vectores normalizados, coseno = producto escalar
    # devuelve los k trozos con mayor coseno
```

**Cómo comprobarlo:** Pregunta lo mismo con otras palabras (o en otro idioma) y compara con BM25: la semántica tiene que encontrar el trozo que la léxica no ve.

### 4. Híbrido y reordenado

**Pieza:** El recuperador híbrido: fusión por rangos y, si compensa, reordenado.

```python
def rrf(lexical, semantic, weight=0.5, k=60):
    # puntos[trozo] += (1 - weight) / (k + puesto_lexico)
    # puntos[trozo] += weight / (k + puesto_semantico)
    # ordena por puntos, de más a menos

def retrieve(query, k, rerank_depth=0):
    # pide ~20 a cada buscador y fusiona
    # opcional: reordena los rerank_depth primeros (cross-encoder)
    # devuelve los k primeros
```

**Cómo comprobarlo:** Con una pregunta de identificador exacto y otra con otras palabras, el híbrido tiene que acertar las dos. Mide cuánto tarda con y sin reordenado.

### 5. El prompt

**Pieza:** El montador del prompt: instrucciones, fuentes numeradas y pregunta, sin pasar del presupuesto.

```python
def build_prompt(question, chunks, budget):
    # used = tokens(INSTRUCCIONES) + tokens(question)
    # recorre chunks del mejor al peor:
    #   si used + tokens(trozo) > budget: para
    #   añade "[n] ruta:lineas" y el texto; suma a used
    # termina con la pregunta
    # devuelve el prompt y las fuentes que entraron
```

**Cómo comprobarlo:** Con un presupuesto pequeño, el trozo mejor puntuado tiene que seguir dentro. Cuenta los tokens con el tokenizador de tu modelo, no a ojo.

### 6. Generación con fundamento

**Pieza:** El generador: el modelo local responde con citas o reconoce que no lo sabe.

```python
INSTRUCCIONES = (
    "Responde solo con las fuentes. Cita así: [n]. "
    "Si no está en las fuentes, di: No lo sé."
)

def answer(question, k):
    # chunks = retrieve(question, k)
    # si el mejor trozo puntúa por debajo de un mínimo: "No lo sé"
    # texto = llm(build_prompt(question, chunks, budget))
    # devuelve texto y las fuentes citadas (ruta y líneas)
```

**Cómo comprobarlo:** Haz una pregunta que tu corpus no responde: tiene que decir «No lo sé». En las que sí responde, abre la fuente citada y comprueba que la frase está ahí.

### 7. Evaluar

**Pieza:** El evaluador: recall@k y MRR de tu recuperador contra un conjunto de referencia.

```python
def is_hit(found, gold):
    # mismo fichero y las líneas se solapan lo bastante

def evaluate(dataset, k):
    # por cada pregunta: found = retrieve(pregunta, k)
    # recall@k: ¿hay algún acierto entre los k?
    # mrr: 1 / puesto del primer acierto (0 si no hay)
    # devuelve las medias y la lista de preguntas falladas
```

**Cómo comprobarlo:** Un recuperador que devuelve siempre lo mismo tiene que dar un recall bajísimo; uno que devuelve la respuesta de referencia, 1. Si no, el evaluador está mal.

### 8. Afinar sin sobreajustar

**Pieza:** El laboratorio: probar configuraciones con validación cruzada y apuntar lo que cuesta cada una.

```python
def cross_validate(config, dataset, folds=5):
    # parte dataset en folds trozos; evalúa config en cada uno
    # devuelve la media y cuánto varía entre trozos

def tune(grid, dataset):
    # aparta un 20 % de test y no lo mires hasta el final
    # por cada config: media de cross_validate y segundos que tarda
    # elige la mejor por la media; ante empate, la más barata
    # una sola vez: evalúa la elegida en test
```

**Cómo comprobarlo:** La diferencia entre dev y test de la configuración elegida tiene que ser pequeña. Si en dev da 1,00, busca la fuga antes de celebrarlo.

### 9. Producción

**Pieza:** Lo que lo vuelve un servicio: indexado incremental, caché y una API HTTP.

```python
def index(root):
    # hash de cada fichero; compara con el manifiesto guardado
    # solo trocea y calcula embeddings de lo nuevo o cambiado
    # borra los trozos de ficheros que ya no existen; vacía la caché

def cached_answer(question, k):
    # clave = (pregunta normalizada, k, versión del índice)

# POST /answer {"query", "k"} -> {"answer", "sources"}
# valida antes de buscar: query vacía o k fuera de rango = 422
```

**Cómo comprobarlo:** Cambia un fichero y reindexa: solo se recalculan sus trozos y la respuesta nueva sale a la primera. Repite una pregunta: la segunda vez tarda milisegundos.

Con las nueve piezas tienes lo que pide el proyecto: indexar un repositorio
(código y Markdown) troceando con estructura, un índice léxico y otro
semántico, recuperación híbrida, respuestas de un modelo pequeño local con
sus fuentes, evaluación con recall@k y, de bonus, indexado incremental, caché
y API HTTP.

## Cómo está hecho

- `packages/ragsim`: un RAG en miniatura, en TypeScript puro (sin `fs`, red,
  `eval` ni modelos; un test lo comprueba) y determinista, con topes
  (`limits.ts`): lo que llega de fuera se recorta a su rango o se descarta.
  - `corpus.ts` y `questions.ts`: el repositorio de Colmena y las preguntas de
    referencia con su respuesta (`gold`) y lo que tiene que decir (`says`).
  - `text.ts`, `chunk.ts`: tokenizador (normalizar, palabras vacías, recortar)
    y troceadores (fijo con solape; por estructura: encabezados, `def`/`class`).
  - `bm25.ts`: TF, IDF y BM25 con `k1` y `b`.
  - `embed.ts`: embeddings **de juguete**: una dimensión por concepto, con las
    palabras que lo nombran en castellano y en inglés escritas a mano, y
    similitud coseno. Encuentran «volver a intentarlo» aunque el documento
    diga «reintentos» o «retry», y fallan con identificadores exactos, como los
    de verdad.
  - `rank.ts`: RRF con peso y reordenado de los primeros.
  - `generate.ts`: el prompt con su presupuesto y el «generador», que responde
    con la frase del contexto que mejor respalda la pregunta y su cita, dice
    «no lo sé» si nada llega al mínimo o, si no se le exige fundamento,
    contesta de memoria un dato viejo (así se ve la alucinación).
  - `pipeline.ts`: la tubería entera (`ask`), las métricas (`evaluate`:
    recall@1/3/5/k, precisión, MRR, respuestas enteras al trocear, trozo bueno
    en el prompt, respuestas correctas y citadas, «no lo sé», inventadas,
    tokens, latencia simulada, secretos, ruido y fugas) y en qué etapa se
    pierde cada respuesta (`judge`).
  - `ops.ts`: una mañana de producción (indexar, preguntas repetidas, cambia
    una guía, reindexar) para el indexado incremental y la caché, y la API
    HTTP mínima (`/healthz`, `/search`, `/answer`) con sus códigos.
  - `course/`: las 45 unidades (`beginner.ts`, `intermediate.ts`,
    `advanced.ts`), los bloques con su pieza de la guía (`blocks.ts`) y el
    banco de pruebas (`check.ts`): cinco tipos de tarea (`tune`, `calc`,
    `pick`, `order`, `api`), lo que se enseña de cada una, las comprobaciones
    (`Run`) y su corrección (`checkAttempt`).
- `apps/api/src/modules/ragcourse`: el servicio de los cursos de terminal
  (`createShellCourseService`) con este motor y sus tablas `rag_progress` y
  `rag_runs`; el tiempo activo va a `course_times` con `course = 'rag'`. Rutas
  en `docs/api.md`.
- `apps/web/src/features/ragcourse`: el camino (`RagCourseTab.tsx`), la unidad
  y el ejemplo (`UnitView.tsx`), la tubería que se ve (`Pipeline.tsx`), el
  banco de pruebas (`Bench.tsx`) y la demostración (`RagCourseTour.tsx`).
  Estilos en `styles/ragcourse.css`, con las variables del tema.

## Lo que el simulador hace distinto de un RAG de verdad

- Los embeddings son una lista de conceptos hecha a mano, no un modelo: lo
  que no esté en la lista no «significa» nada. Sirve para ver por qué la
  búsqueda semántica encuentra lo que la léxica no, no para medir un modelo.
- El generador no escribe: extrae una frase. No resume ni junta dos fuentes.
- Un token es una palabra. En tu proyecto, cuenta con el tokenizador del modelo.
- La latencia son milisegundos de mentira con las proporciones de verdad
  (léxica barata, embeddings más caros, reordenar lo más caro por trozo).
- El corpus tiene 15 documentos y unas decenas de trozos: las cifras se
  mueven a saltos, y por eso cada objetivo sale de ejecutar su solución.

## Dudas abiertas

- Las estrellas por comprobaciones son nuevas (`tryGoals`): el margen (una de
  más) es a ojo y se ajustará viendo cómo se juega.
- No hay preguntas del curso en Not-games todavía (la pieza 7 de la plantilla
  de explicación): el error típico de cada unidad ya está escrito para hacerlas.
- El contenido está en castellano e inglés; en francés sale el inglés.
