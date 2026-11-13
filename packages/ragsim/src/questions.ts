/**
 * El conjunto de referencia: preguntas sobre Colmena con el sitio exacto del
 * corpus donde está su respuesta (el documento y la frase). Con él se mide en
 * vez de mirar a ojo: un trozo **acierta** una pregunta si contiene la frase
 * entera.
 *
 * Hay preguntas con las palabras del documento (`exact`), con otras palabras o
 * en el otro idioma (`paraphrase`) y sin respuesta en el corpus (`none`: lo
 * correcto es decir «no lo sé»). Y dos partes: `dev`, para probar y afinar, y
 * `test`, que se guarda para comprobar al final que lo afinado no era
 * casualidad.
 */

import type { Doc } from './corpus.js'

export type QuestionKind = 'exact' | 'paraphrase' | 'none'

export type Gold = { doc: string; needle: string }

export type Question = {
  id: string
  text: string
  kind: QuestionKind
  set: 'dev' | 'test' | 'typed'
  /** Dónde está la respuesta (vacío si no la hay). */
  gold: readonly Gold[]
  /** Lo que tiene que decir una respuesta para darla por buena «a ojo» (cualquiera de ellas). */
  says: readonly string[]
}

/**
 * La respuesta corta de cada pregunta. Comparar el texto de la respuesta con
 * ella es la manera rápida de evaluar (métrica `match`), y la que se deja
 * engañar si las preguntas con su solución acaban dentro del índice.
 */
const SAYS: Record<string, readonly string[]> = {
  retries: ['5 veces'],
  backoff: ['2 segundos'],
  full: ['QueueFull'],
  heartbeat: ['15 seconds'],
  shutdown: ['30 seconds'],
  redis: ['COLMENA_REDIS_URL'],
  twice: ['muere a medias'],
  health: ['8787'],
  function: ['def backoff_seconds'],
  parallel: ['4 tasks'],
  dead: ['colmena:dead'],
  priority: ['prioridad alta', 'high priority'],
  legacy: ['ya no se puede usar'],
  memory: ['150 MB'],
  python: ['3.10'],
  maxsize: ['10000'],
  logs: ['JSON'],
  queuefull: ['llena', 'MAX_SIZE'],
  concurrency: ['4 tasks', 'COLMENA_CONCURRENCY'],
  deadworker: ['60 seconds'],
  start: ['colmena worker'],
  delay: ['espera esos segundos'],
}

const q = (
  id: string,
  set: Question['set'],
  kind: QuestionKind,
  text: string,
  ...gold: [doc: string, needle: string][]
): Question => ({
  id,
  text,
  kind,
  set,
  gold: gold.map(([doc, needle]) => ({ doc, needle })),
  says: SAYS[id] ?? [],
})

export const QUESTIONS: readonly Question[] = [
  q('retries', 'dev', 'exact', '¿Cuántas veces se reintenta una tarea por defecto?', [
    'docs/reintentos.md',
    'Por defecto cada tarea se reintenta 5 veces.',
  ]),
  q('backoff', 'dev', 'paraphrase', '¿Cuánto tarda en volver a intentarlo?', [
    'docs/reintentos.md',
    'La espera crece de forma exponencial: empieza en 2 segundos y se duplica en cada reintento, hasta un máximo de 300 segundos.',
  ]),
  q('full', 'dev', 'exact', '¿Qué error lanza encolar si la cola está llena?', [
    'docs/colas.md',
    'Si está llena, encolar lanza el error QueueFull.',
  ]),
  q('heartbeat', 'dev', 'exact', 'How often does a worker send a heartbeat?', [
    'docs/workers.md',
    'Every worker sends a heartbeat every 15 seconds.',
  ]),
  q('shutdown', 'dev', 'paraphrase', '¿Qué hace el worker cuando lo apagan?', [
    'docs/workers.md',
    'On SIGTERM the worker stops taking new tasks and waits up to 30 seconds for the running ones to finish.',
  ]),
  q('redis', 'dev', 'exact', '¿De qué variable lee Colmena la dirección de Redis?', [
    'docs/instalacion.md',
    'Colmena lee la dirección de Redis de la variable COLMENA_REDIS_URL.',
  ]),
  q('twice', 'dev', 'paraphrase', 'Why did my job run twice?', [
    'docs/problemas.md',
    'Una tarea puede ejecutarse dos veces si el worker muere a medias.',
  ]),
  q('health', 'dev', 'exact', 'Which port is the health endpoint on?', [
    'docs/deploy.md',
    'The worker exposes a health endpoint at /healthz on port 8787.',
  ]),
  q('function', 'dev', 'exact', 'Where is backoff_seconds defined?', [
    'src/colmena/retry.py',
    'def backoff_seconds(attempt: int) -> float:',
  ]),
  q('parallel', 'dev', 'paraphrase', '¿Cuántos trabajos ejecuta un worker en paralelo?', [
    'docs/workers.md',
    'A worker runs 4 tasks at the same time by default.',
  ]),
  q('dead', 'dev', 'exact', '¿A dónde va una tarea que agota sus reintentos?', [
    'docs/reintentos.md',
    'Cuando una tarea agota sus reintentos pasa a la cola de fallidas, colmena:dead.',
  ]),
  q(
    'priority',
    'dev',
    'paraphrase',
    'Which jobs are picked first?',
    ['docs/colas.md', 'El worker saca antes las tareas de prioridad alta.'],
    ['src/colmena/queue.py', '"""Return the next task, high priority first."""'],
  ),
  q('legacy', 'dev', 'exact', '¿Se puede usar todavía la opción --legacy?', [
    'docs/changelog.md',
    'Se elimina la opción --legacy: ya no se puede usar.',
  ]),
  q('price', 'dev', 'none', '¿Cuánto cuesta la licencia de Colmena?'),
  q('windows', 'dev', 'none', 'Does Colmena support Windows?'),
  q('memory', 'test', 'paraphrase', '¿Cuánta RAM gasta cada worker?', [
    'docs/deploy.md',
    'Each worker needs about 150 MB of memory.',
  ]),
  q(
    'python',
    'test',
    'paraphrase',
    'Which Python version do I need?',
    [
      'docs/instalacion.md',
      'Colmena necesita Python 3.10 o superior y un servidor Redis 6 o superior.',
    ],
    ['README.md', 'Colmena needs Python 3.10 or newer and a Redis server.'],
  ),
  q('maxsize', 'test', 'exact', '¿Cuál es el máximo de tareas pendientes de una cola?', [
    'docs/colas.md',
    'Una cola admite como máximo 10000 tareas pendientes.',
  ]),
  q('logs', 'test', 'exact', 'What format are the logs written in?', [
    'docs/deploy.md',
    'Logs are written as JSON, one line per event, to standard output.',
  ]),
  q(
    'queuefull',
    'test',
    'exact',
    'What does QueueFull mean?',
    ['src/colmena/queue.py', '"""Raised when the queue already holds MAX_SIZE pending tasks."""'],
    ['docs/colas.md', 'Si está llena, encolar lanza el error QueueFull.'],
  ),
  q('concurrency', 'test', 'exact', '¿Para qué sirve COLMENA_CONCURRENCY?', [
    'docs/workers.md',
    'A worker runs 4 tasks at the same time by default. Change it with COLMENA_CONCURRENCY.',
  ]),
  q('deadworker', 'test', 'paraphrase', '¿Cuándo se da por muerto a un worker?', [
    'docs/workers.md',
    'A worker with no heartbeat for 60 seconds is considered dead and its tasks go back to the queue.',
  ]),
  q('start', 'test', 'exact', 'How do I start a worker?', [
    'README.md',
    'Start a worker with colmena worker --queue default.',
  ]),
  q('delay', 'test', 'paraphrase', '¿Cómo retraso una tarea unos segundos?', [
    'docs/colas.md',
    'Con delay la tarea espera esos segundos antes de estar disponible.',
  ]),
  q('panel', 'test', 'none', '¿Tiene Colmena un panel web?'),
  // Como escribe la gente con prisa: sin acentos, en mayúsculas, en plural. Solo las usa la unidad de normalizar.
  q('t-limit', 'typed', 'exact', 'LIMITE DE TAMANO DE LAS COLAS', [
    'docs/colas.md',
    'Una cola admite como máximo 10000 tareas pendientes.',
  ]),
  q('t-sigterm', 'typed', 'exact', 'what happens on sigterm', [
    'docs/workers.md',
    'On SIGTERM the worker stops taking new tasks and waits up to 30 seconds for the running ones to finish.',
  ]),
  q('t-conexion', 'typed', 'exact', 'como configuro la conexion', [
    'docs/instalacion.md',
    'Colmena lee la dirección de Redis de la variable COLMENA_REDIS_URL.',
  ]),
  q('t-idempotent', 'typed', 'exact', 'TAREA IDEMPOTENTE', [
    'docs/problemas.md',
    'Haz que tus tareas sean idempotentes: que repetirlas no cambie el resultado.',
  ]),
  q('t-scaling', 'typed', 'exact', 'what is the memory of the worker', [
    'docs/deploy.md',
    'Each worker needs about 150 MB of memory.',
  ]),
]

export function questionOf(id: string): Question | undefined {
  return QUESTIONS.find((question) => question.id === id)
}

/** Los ids de las preguntas de una parte o de un tipo (o de las dos cosas). */
export function questionIds(filter: { set?: Question['set']; kind?: QuestionKind } = {}): string[] {
  return QUESTIONS.filter(
    (question) =>
      (filter.set === undefined || question.set === filter.set) &&
      (filter.kind === undefined || question.kind === filter.kind),
  ).map((question) => question.id)
}

/** Dónde cae cada respuesta de una pregunta en esos documentos: `[documento, inicio, fin]`. */
export function goldSpans(question: Question, docs: readonly Doc[]): [string, number, number][] {
  return question.gold.flatMap((gold): [string, number, number][] => {
    const start = docs.find((doc) => doc.path === gold.doc)?.text.indexOf(gold.needle) ?? -1

    return start < 0 ? [] : [[gold.doc, start, start + gold.needle.length]]
  })
}
