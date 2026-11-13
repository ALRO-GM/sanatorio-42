/**
 * El corpus del curso: la documentación y el código de **Colmena**, una cola
 * de tareas en Python que no existe. Es pequeño a propósito (cabe en la cabeza
 * y en la pantalla) y mezcla castellano e inglés, guías y código, para que
 * cada técnica del curso tenga algo que ganar o que perder: frases que un
 * troceado fijo parte por la mitad, identificadores que solo encuentra la
 * búsqueda léxica, preguntas con otras palabras (o en otro idioma) que solo
 * encuentra la semántica, un changelog con datos viejos que despista y, para
 * la unidad de carga, ficheros que no deberían indexarse (un `.env` con una
 * contraseña, un `poetry.lock` lleno de ruido y las preguntas de evaluación).
 *
 * Nada de esto se lee del disco: son cadenas dentro del paquete.
 */

export type DocKind = 'md' | 'py' | 'other'

/** De dónde sale un documento: es lo que se elige al cargar el corpus. */
export type Source = 'docs' | 'code' | 'lock' | 'env' | 'eval'

export type Doc = {
  path: string
  kind: DocKind
  source: Source
  text: string
}

const text = (...lines: string[]): string => lines.join('\n')

const README = text(
  '# Colmena',
  '',
  'Colmena is a small task queue for Python. You push tasks to a queue and workers run them in the background.',
  '',
  '## Quick start',
  '',
  'Install it with pip install colmena. Colmena needs Python 3.10 or newer and a Redis server.',
  '',
  'Start a worker with colmena worker --queue default. The worker picks tasks from the queue and runs them.',
  '',
  '## Documentation',
  '',
  'The guides live in the docs folder: installation, queues, retries, workers and deployment.',
)

const INSTALACION = text(
  '# Instalación',
  '',
  '## Requisitos',
  '',
  'Colmena necesita Python 3.10 o superior y un servidor Redis 6 o superior.',
  '',
  '## Instalar',
  '',
  'Instala el paquete con pip install colmena. Para comprobarlo, ejecuta colmena --version.',
  '',
  '## Configurar la conexión',
  '',
  'Colmena lee la dirección de Redis de la variable COLMENA_REDIS_URL. Si no existe, usa redis://localhost:6379/0.',
)

const COLAS = text(
  '# Colas',
  '',
  '## Crear una cola',
  '',
  'Cada cola tiene un nombre. Si no indicas ninguno, la tarea va a la cola default.',
  '',
  '## Prioridad',
  '',
  'Una tarea puede tener prioridad alta, normal o baja. El worker saca antes las tareas de prioridad alta.',
  '',
  '## Límite de tamaño',
  '',
  'Una cola admite como máximo 10000 tareas pendientes. Si está llena, encolar lanza el error QueueFull.',
  '',
  '## Tareas programadas',
  '',
  'Con delay la tarea espera esos segundos antes de estar disponible.',
)

const REINTENTOS = text(
  '# Reintentos',
  '',
  '## Cuántas veces',
  '',
  'Si una tarea falla, Colmena la reintenta. Por defecto cada tarea se reintenta 5 veces.',
  '',
  '## Espera entre reintentos',
  '',
  'La espera crece de forma exponencial: empieza en 2 segundos y se duplica en cada reintento, hasta un máximo de 300 segundos.',
  '',
  '## Cola de fallidas',
  '',
  'Cuando una tarea agota sus reintentos pasa a la cola de fallidas, colmena:dead. Desde ahí la puedes revisar y volver a encolar a mano.',
)

const WORKERS = text(
  '# Workers',
  '',
  '## Concurrency',
  '',
  'A worker runs 4 tasks at the same time by default. Change it with COLMENA_CONCURRENCY.',
  '',
  '## Heartbeat',
  '',
  'Every worker sends a heartbeat every 15 seconds. A worker with no heartbeat for 60 seconds is considered dead and its tasks go back to the queue.',
  '',
  '## Graceful shutdown',
  '',
  'On SIGTERM the worker stops taking new tasks and waits up to 30 seconds for the running ones to finish.',
)

const DEPLOY = text(
  '# Deployment',
  '',
  '## Environment',
  '',
  'Set COLMENA_REDIS_URL to your production Redis. Never commit the .env file: it holds the password.',
  '',
  '## Health check',
  '',
  'The worker exposes a health endpoint at /healthz on port 8787. It answers 200 while the worker is alive.',
  '',
  '## Scaling',
  '',
  'Add more workers to go faster. Each worker needs about 150 MB of memory.',
  '',
  '## Logs',
  '',
  'Logs are written as JSON, one line per event, to standard output.',
)

const PROBLEMAS = text(
  '# Problemas frecuentes',
  '',
  '## El worker no arranca',
  '',
  'Casi siempre es la conexión: comprueba que COLMENA_REDIS_URL apunta a un Redis que responde.',
  '',
  '## Tareas duplicadas',
  '',
  'Una tarea puede ejecutarse dos veces si el worker muere a medias. Haz que tus tareas sean idempotentes: que repetirlas no cambie el resultado.',
  '',
  '## La cola no se vacía',
  '',
  'Si hay más tareas de las que los workers pueden ejecutar, la cola crece. Añade workers o sube la concurrencia.',
)

const CHANGELOG = text(
  '# Historial de cambios',
  '',
  '## 2.0',
  '',
  'Los reintentos por defecto suben a 5. Se elimina la opción --legacy: ya no se puede usar.',
  '',
  '## 1.4',
  '',
  'Nueva cola de fallidas para las tareas que agotan sus reintentos.',
  '',
  '## 1.0',
  '',
  'Primera versión. Cada tarea se reintenta 3 veces por defecto y el latido va cada 30 segundos.',
)

const RETRY_PY = text(
  '"""Retry policy: how many times and how long to wait."""',
  '',
  'MAX_RETRIES = 5',
  'BASE_DELAY = 2.0',
  'MAX_DELAY = 300.0',
  '',
  '',
  'def backoff_seconds(attempt: int) -> float:',
  '    """Seconds to wait before retry number `attempt` (exponential backoff)."""',
  '    return min(BASE_DELAY * 2 ** attempt, MAX_DELAY)',
  '',
  '',
  'def should_retry(attempt: int) -> bool:',
  '    """True while the task has retries left."""',
  '    return attempt < MAX_RETRIES',
  '',
  '',
  'def to_dead_letter(task) -> None:',
  '    """Move a task that ran out of retries to the dead letter queue."""',
  '    task.queue = "colmena:dead"',
)

const QUEUE_PY = text(
  '"""Queues: push tasks with a priority and an optional delay."""',
  '',
  'MAX_SIZE = 10000',
  'PRIORITIES = ("high", "normal", "low")',
  '',
  '',
  'class QueueFull(Exception):',
  '    """Raised when the queue already holds MAX_SIZE pending tasks."""',
  '',
  '',
  'class Queue:',
  '    def __init__(self, name: str = "default") -> None:',
  '        self.name = name',
  '        self.tasks = []',
  '',
  '    def enqueue(self, task, priority: str = "normal", delay: int = 0) -> None:',
  '        """Add a task; it becomes available after `delay` seconds."""',
  '        if len(self.tasks) >= MAX_SIZE:',
  '            raise QueueFull(self.name)',
  '        self.tasks.append((priority, delay, task))',
  '',
  '    def dequeue(self):',
  '        """Return the next task, high priority first."""',
  '        self.tasks.sort(key=lambda item: PRIORITIES.index(item[0]))',
  '        return self.tasks.pop(0)',
)

const WORKER_PY = text(
  '"""Worker: runs tasks, sends heartbeats and shuts down gracefully."""',
  '',
  'HEARTBEAT_SECONDS = 15',
  'DEAD_AFTER_SECONDS = 60',
  'SHUTDOWN_TIMEOUT = 30',
  '',
  '',
  'class Worker:',
  '    def __init__(self, queue, concurrency: int = 4) -> None:',
  '        self.queue = queue',
  '        self.concurrency = concurrency',
  '        self.running = True',
  '',
  '    def heartbeat(self) -> None:',
  '        """Tell Redis this worker is alive."""',
  '        self.queue.redis.set(self.key, "alive", ex=DEAD_AFTER_SECONDS)',
  '',
  '    def run(self) -> None:',
  '        """Take tasks from the queue until shutdown is requested."""',
  '        while self.running:',
  '            task = self.queue.dequeue()',
  '            task.run()',
  '',
  '    def shutdown(self, timeout: int = SHUTDOWN_TIMEOUT) -> None:',
  '        """Stop taking tasks and wait for the running ones."""',
  '        self.running = False',
  '        self.wait(timeout)',
)

const CONFIG_PY = text(
  '"""Configuration from environment variables."""',
  '',
  'DEFAULT_REDIS_URL = "redis://localhost:6379/0"',
  'DEFAULT_CONCURRENCY = 4',
  '',
  '',
  'def load_config(env: dict) -> dict:',
  '    """Read COLMENA_REDIS_URL and COLMENA_CONCURRENCY, with defaults."""',
  '    return {',
  '        "redis_url": env.get("COLMENA_REDIS_URL", DEFAULT_REDIS_URL),',
  '        "concurrency": int(env.get("COLMENA_CONCURRENCY", DEFAULT_CONCURRENCY)),',
  '    }',
)

/**
 * Ruido: las dependencias del proyecto. Sus descripciones repiten las palabras
 * de Colmena una y otra vez sin decir nada de ella: para un buscador que
 * cuenta palabras, son un imán.
 */
const LOCK = text(
  '[[package]]',
  'name = "redis"',
  'version = "5.0.4"',
  'description = "Python client for Redis: redis server, redis url, redis connection, redis variable"',
  '',
  '[[package]]',
  'name = "queuelib"',
  'version = "1.7.0"',
  'description = "Queue classes: queue, queues, full queue, queue error, pending tasks, tasks, task"',
  '',
  '[[package]]',
  'name = "heartbeat-monitor"',
  'version = "0.3.1"',
  'description = "Worker heartbeat monitor: heartbeat, heartbeats, worker, workers, send, seconds, health, endpoint, port"',
  '',
  '[[package]]',
  'name = "tareas-reintentos"',
  'version = "2.1.0"',
  'description = "Reintentos de tareas: tarea, tareas, reintenta, reintentos, reintentar, veces, defecto, cola, colas, error"',
)

/** Un secreto: no debería llegar nunca al índice ni, de ahí, a una respuesta. */
const ENV = text(
  'COLMENA_REDIS_URL=redis://:s3cr3t-pr0d@redis.internal:6379/0',
  'COLMENA_CONCURRENCY=8',
)

/**
 * Las preguntas de evaluación con su respuesta, tal como las guardaría alguien
 * en el repositorio. Si se indexan, el sistema «acierta» copiando: es la fuga
 * del conjunto de evaluación.
 */
const EVAL = text(
  '{"pregunta": "¿Cuántas veces se reintenta una tarea por defecto?", "respuesta": "5 veces"}',
  '{"pregunta": "¿Qué error lanza encolar si la cola está llena?", "respuesta": "QueueFull"}',
  '{"pregunta": "How often does a worker send a heartbeat?", "respuesta": "every 15 seconds"}',
  '{"pregunta": "¿De qué variable lee Colmena la dirección de Redis?", "respuesta": "COLMENA_REDIS_URL"}',
  '{"pregunta": "Which port is the health endpoint on?", "respuesta": "port 8787"}',
  '{"pregunta": "¿A dónde va una tarea que agota sus reintentos?", "respuesta": "a colmena:dead"}',
)

export const DOCS: readonly Doc[] = [
  { path: 'README.md', kind: 'md', source: 'docs', text: README },
  { path: 'docs/instalacion.md', kind: 'md', source: 'docs', text: INSTALACION },
  { path: 'docs/colas.md', kind: 'md', source: 'docs', text: COLAS },
  { path: 'docs/reintentos.md', kind: 'md', source: 'docs', text: REINTENTOS },
  { path: 'docs/workers.md', kind: 'md', source: 'docs', text: WORKERS },
  { path: 'docs/deploy.md', kind: 'md', source: 'docs', text: DEPLOY },
  { path: 'docs/problemas.md', kind: 'md', source: 'docs', text: PROBLEMAS },
  { path: 'docs/changelog.md', kind: 'md', source: 'docs', text: CHANGELOG },
  { path: 'src/colmena/retry.py', kind: 'py', source: 'code', text: RETRY_PY },
  { path: 'src/colmena/queue.py', kind: 'py', source: 'code', text: QUEUE_PY },
  { path: 'src/colmena/worker.py', kind: 'py', source: 'code', text: WORKER_PY },
  { path: 'src/colmena/config.py', kind: 'py', source: 'code', text: CONFIG_PY },
  { path: 'poetry.lock', kind: 'other', source: 'lock', text: LOCK },
  { path: '.env', kind: 'other', source: 'env', text: ENV },
  { path: 'eval/preguntas.jsonl', kind: 'other', source: 'eval', text: EVAL },
]

export const SOURCES: readonly Source[] = ['docs', 'code', 'lock', 'env', 'eval']

export function docOf(path: string): Doc | undefined {
  return DOCS.find((doc) => doc.path === path)
}

/**
 * El cambio que alguien del equipo sube a mitad del curso (unidades de
 * producción): los reintentos por defecto pasan de 5 a 7. Lo que estaba
 * indexado o en caché con el 5 se queda viejo.
 */
export function editedDocs(): Doc[] {
  return DOCS.map((doc) =>
    doc.path === 'docs/reintentos.md'
      ? { ...doc, text: doc.text.replace('se reintenta 5 veces', 'se reintenta 7 veces') }
      : doc,
  )
}
